// pages/ReviewerBidding.js
// Feature 2 — Reviewer Bidding + Feature 3 Double Blind display

import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getOpenPapersForBidding, submitBid, getMyBids } from '../services/api';

const BID_LEVELS = [
  { value: 'interested',    label: '✅ Interested',     color: '#c6f6d5', text: '#276749' },
  { value: 'neutral',       label: '➖ Neutral',         color: '#fefcbf', text: '#744210' },
  { value: 'not_interested',label: '❌ Not Interested',  color: '#fed7d7', text: '#9b2c2c' },
];

export default function ReviewerBidding() {
  const [papers, setPapers]       = useState([]);
  const [myBids, setMyBids]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('bid');
  const [saving, setSaving]       = useState({});
  const [msg, setMsg]             = useState({});

  const load = () => {
    Promise.all([getOpenPapersForBidding(), getMyBids()])
      .then(([p, b]) => { setPapers(p.data); setMyBids(b.data); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleBid = async (paper_id, bid_level) => {
    setSaving(prev => ({ ...prev, [paper_id]: true }));
    try {
      await submitBid({ paper_id, bid_level });
      setMsg(prev => ({ ...prev, [paper_id]: { type: 'success', text: `Bid saved: ${bid_level}` } }));
      load();
    } catch (err) {
      setMsg(prev => ({ ...prev, [paper_id]: { type: 'error', text: err.response?.data?.message || 'Failed' } }));
    } finally {
      setSaving(prev => ({ ...prev, [paper_id]: false }));
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Reviewer Bidding</h1>
        <p>Express interest on papers you'd like to review. Author identities are hidden (double-blind).</p>
      </div>
      <div className="tabs">
        <button className={`tab-btn${activeTab === 'bid' ? ' active' : ''}`} onClick={() => setActiveTab('bid')}>
          📋 All Papers ({papers.length})
        </button>
        <button className={`tab-btn${activeTab === 'mybids' ? ' active' : ''}`} onClick={() => setActiveTab('mybids')}>
          🏷 My Bids ({myBids.length})
        </button>
      </div>

      {loading ? <div className="spinner" /> : activeTab === 'bid' ? (
        papers.length === 0
          ? <div className="alert alert-info">No papers are currently open for bidding.</div>
          : papers.map(paper => (
            <div className="card" key={paper.paper_id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  {/* Double blind — no author info shown */}
                  <h3 style={{ fontSize: 16 }}>{paper.title}</h3>
                  <div style={{ fontSize: 12, color: '#a0aec0', marginBottom: 8 }}>
                    📌 {paper.conference_title} &bull; v{paper.version}
                    <span style={{ marginLeft: 12, background: '#e2e8f0', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>
                      🔒 Double-Blind — Author Hidden
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.6 }}>
                    {paper.abstract?.slice(0, 240)}{paper.abstract?.length > 240 ? '...' : ''}
                  </p>
                  {paper.keywords && (
                    <div style={{ marginTop: 8 }}>
                      {paper.keywords.split(',').map(k => (
                        <span key={k} style={{ display: 'inline-block', background: '#ebf4ff', color: '#2b6cb0', borderRadius: 4, padding: '1px 8px', fontSize: 11, marginRight: 4 }}>{k.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 180, textAlign: 'right' }}>
                  {paper.my_bid && paper.my_bid !== 'not_bid' && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#718096' }}>Current bid: </span>
                      <strong style={{ color: '#1e3a5f' }}>{paper.my_bid.replace('_', ' ')}</strong>
                    </div>
                  )}
                </div>
              </div>
              {msg[paper.paper_id] && (
                <div className={`alert alert-${msg[paper.paper_id].type === 'success' ? 'success' : 'error'}`} style={{ marginTop: 10 }}>
                  {msg[paper.paper_id].text}
                </div>
              )}
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, alignSelf: 'center' }}>Your Bid:</span>
                {BID_LEVELS.map(bl => (
                  <button
                    key={bl.value}
                    onClick={() => handleBid(paper.paper_id, bl.value)}
                    disabled={saving[paper.paper_id]}
                    style={{
                      padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600,
                      background: paper.my_bid === bl.value ? bl.color : '#f0f0f0',
                      color: paper.my_bid === bl.value ? bl.text : '#4a5568',
                      border: paper.my_bid === bl.value ? `1.5px solid ${bl.text}` : '1.5px solid transparent',
                      transition: 'all 0.15s'
                    }}
                  >
                    {bl.label}
                  </button>
                ))}
              </div>
            </div>
          ))
      ) : (
        /* My Bids tab */
        myBids.length === 0
          ? <div className="alert alert-info">You haven't placed any bids yet.</div>
          : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Paper Title</th><th>Conference</th><th>Bid Level</th><th>Bid Date</th></tr></thead>
                  <tbody>
                    {myBids.map(b => {
                      const bl = BID_LEVELS.find(l => l.value === b.bid_level);
                      return (
                        <tr key={b.bid_id}>
                          <td><strong>{b.paper_title}</strong></td>
                          <td>{b.conference_title}</td>
                          <td>
                            <span style={{ background: bl?.color, color: bl?.text, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                              {b.bid_level.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: '#718096' }}>{new Date(b.bid_date).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}
    </Layout>
  );
}
