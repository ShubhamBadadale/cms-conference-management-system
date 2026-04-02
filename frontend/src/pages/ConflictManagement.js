// pages/ConflictManagement.js
// Feature 1 — COI system (shared page, behavior differs by role)

import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getMyConflicts, declareConflict, getConflictsForPaper, adminFlagConflict, getAllSubmissions } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function ReviewerConflicts() {
  const [conflicts, setConflicts] = useState([]);
  const [papers, setPapers]       = useState([]);
  const [form, setForm]           = useState({ paper_id: '', reason: '' });
  const [loading, setLoading]     = useState(true);
  const [msg, setMsg]             = useState('');
  const [err, setErr]             = useState('');

  const { getOpenPapersForBidding } = require('../services/api');

  const load = () => {
    Promise.all([getMyConflicts(), getOpenPapersForBidding()])
      .then(([c, p]) => { setConflicts(c.data); setPapers(p.data); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleDeclare = async (e) => {
    e.preventDefault(); setMsg(''); setErr('');
    try {
      await declareConflict(form);
      setMsg('Conflict of interest declared. Admin has been notified.');
      setForm({ paper_id: '', reason: '' });
      load();
    } catch (er) { setErr(er.response?.data?.message || 'Failed'); }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Conflict of Interest</h1>
        <p>Declare papers where you have a personal or professional conflict</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Declare a New COI</h3>
          {msg && <div className="alert alert-success">{msg}</div>}
          {err && <div className="alert alert-error">{err}</div>}
          <form onSubmit={handleDeclare}>
            <div className="form-group">
              <label>Paper *</label>
              <select className="form-control" required value={form.paper_id} onChange={e => setForm({...form, paper_id: e.target.value})}>
                <option value="">Select a paper...</option>
                {papers.map(p => <option key={p.paper_id} value={p.paper_id}>{p.title}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Reason</label>
              <textarea className="form-control" rows={3} placeholder="e.g., Co-authored work with this author, same institution..."
                value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
            </div>
            <button className="btn btn-danger" type="submit">⚠ Declare COI</button>
          </form>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>My Declared Conflicts</h3>
          {loading ? <div className="spinner" /> :
            conflicts.length === 0
              ? <p style={{ color: '#718096', fontSize: 14 }}>No conflicts declared.</p>
              : conflicts.map(c => (
                <div key={c.conflict_id} style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.paper_title}</div>
                  <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>{c.reason || 'No reason given'}</div>
                  <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>{new Date(c.created_at).toLocaleDateString()}</div>
                </div>
              ))
          }
        </div>
      </div>
    </Layout>
  );
}

export function AdminConflicts() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState('');
  const [conflicts, setConflicts]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [msg, setMsg]                 = useState('');
  const [err, setErr]                 = useState('');

  useEffect(() => {
    getAllSubmissions().then(r => setSubmissions(r.data)).finally(() => setLoading(false));
  }, []);

  const handleSelect = async (paperId) => {
    setSelectedPaper(paperId);
    if (paperId) {
      const r = await getConflictsForPaper(paperId);
      setConflicts(r.data);
    }
  };

  return (
    <Layout>
      <div className="page-header"><h1>COI Management</h1><p>View and flag conflicts of interest per paper</p></div>
      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}
      <div className="form-group" style={{ maxWidth: 400 }}>
        <label>Select Paper to View COIs</label>
        <select className="form-control" value={selectedPaper} onChange={e => handleSelect(e.target.value)}>
          <option value="">Choose a paper...</option>
          {submissions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>
      {selectedPaper && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Declared Conflicts for Paper #{selectedPaper}</h3>
          {conflicts.length === 0
            ? <p style={{ color: '#718096', fontSize: 14 }}>No conflicts declared for this paper.</p>
            : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Reviewer</th><th>Email</th><th>Reason</th><th>Declared By</th><th>Date</th></tr></thead>
                  <tbody>
                    {conflicts.map(c => (
                      <tr key={c.conflict_id}>
                        <td><strong>{c.reviewer_name}</strong></td>
                        <td>{c.reviewer_email}</td>
                        <td style={{ fontSize: 13 }}>{c.reason || '—'}</td>
                        <td><span className={`badge badge-${c.declared_by === 'admin' ? 'admin' : 'reviewer'}`}>{c.declared_by}</span></td>
                        <td style={{ fontSize: 12, color: '#718096' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      )}
    </Layout>
  );
}
