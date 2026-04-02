// pages/ReviewDiscussion.js
// Feature 5 — Review Discussion System

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getDiscussions, postDiscussionMessage, deleteDiscussionMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ReviewDiscussion() {
  const { paper_id } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [posting, setPosting]   = useState(false);
  const [error, setError]       = useState('');
  const bottomRef = useRef(null);

  const load = () => {
    getDiscussions(paper_id)
      .then(r => setMessages(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load discussions'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [paper_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setPosting(true);
    try {
      await postDiscussionMessage(paper_id, { message: newMsg.trim() });
      setNewMsg('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (discussion_id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteDiscussionMessage(discussion_id);
      setMessages(prev => prev.filter(m => m.discussion_id !== discussion_id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Review Discussion</h1>
        <p>Paper #{paper_id} — Reviewer discussion thread (confidential)</p>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="card" style={{ minHeight: 400, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 500, marginBottom: 16, paddingRight: 4 }}>
          {loading ? <div className="spinner" /> :
            messages.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#a0aec0' }}>
                  <div style={{ fontSize: 36 }}>💬</div>
                  <p style={{ marginTop: 8 }}>No messages yet. Start the discussion below.</p>
                </div>
              )
              : messages.map(m => {
                  const isMine = m.is_mine === 1 || m.is_mine === true;
                  return (
                    <div key={m.discussion_id}
                      style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: isMine ? 'flex-end' : 'flex-start',
                        marginBottom: 16
                      }}
                    >
                      <div style={{
                        maxWidth: '72%', background: isMine ? '#1e3a5f' : '#f0f4ff',
                        color: isMine ? 'white' : '#1a202c',
                        borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        padding: '10px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, opacity: 0.8 }}>
                          {m.poster_name}
                          {isMine && ' (You)'}
                        </div>
                        <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>{m.message}</p>
                        <div style={{ fontSize: 11, marginTop: 6, opacity: 0.65, textAlign: 'right' }}>
                          {new Date(m.posted_at).toLocaleString()}
                        </div>
                      </div>
                      {(isMine || user?.role === 'admin') && (
                        <button
                          onClick={() => handleDelete(m.discussion_id)}
                          style={{ fontSize: 11, color: '#c53030', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}
                        >
                          🗑 Delete
                        </button>
                      )}
                    </div>
                  );
              })
          }
          <div ref={bottomRef} />
        </div>
        {user?.role === 'reviewer' && (
          <form onSubmit={handlePost} style={{ display: 'flex', gap: 10, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Write a discussion message visible to co-reviewers..."
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              style={{ flex: 1, resize: 'none' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(e); } }}
            />
            <button className="btn btn-primary" type="submit" disabled={posting || !newMsg.trim()} style={{ alignSelf: 'flex-end' }}>
              {posting ? '...' : '💬 Post'}
            </button>
          </form>
        )}
      </div>
    </Layout>
  );
}
