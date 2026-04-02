import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getMySubmissions, getPaperReviews, resubmitPaper } from '../services/api';

export default function MySubmissions() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reviews, setReviews] = useState({});
  const [resubFile, setResubFile] = useState(null);
  const [resubMsg, setResubMsg] = useState({});

  useEffect(() => {
    getMySubmissions().then(r => setPapers(r.data)).finally(() => setLoading(false));
  }, []);

  const loadReviews = async (paperId) => {
    if (expandedId === paperId) return setExpandedId(null);
    setExpandedId(paperId);
    if (!reviews[paperId]) {
      const r = await getPaperReviews(paperId);
      setReviews(prev => ({ ...prev, [paperId]: r.data }));
    }
  };

  const handleResubmit = async (paperId) => {
    if (!resubFile) return;
    try {
      const fd = new FormData();
      fd.append('paper_id', paperId);
      fd.append('paper', resubFile);
      await resubmitPaper(fd);
      setResubMsg(prev => ({ ...prev, [paperId]: 'Resubmitted successfully!' }));
      const r = await getMySubmissions();
      setPapers(r.data);
    } catch (err) {
      setResubMsg(prev => ({ ...prev, [paperId]: err.response?.data?.message || 'Resubmission failed' }));
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>My Submissions</h1>
        <p>Track the status of your submitted papers</p>
      </div>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Link to="/submit" className="btn btn-accent">+ Submit New Paper</Link>
      </div>
      {loading ? <div className="spinner" /> : papers.length === 0
        ? <div className="alert alert-info">No papers submitted yet. <Link to="/submit">Submit your first paper →</Link></div>
        : papers.map(paper => (
          <div className="card" key={paper.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 17 }}>{paper.title}</h3>
                <div style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>
                  {paper.conference_title} &bull; v{paper.version} &bull; {new Date(paper.created_at).toLocaleDateString()}
                </div>
                {paper.keywords && <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 4 }}>🏷 {paper.keywords}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge badge-${paper.status}`}>{paper.status.replace('_', ' ')}</span>
                <button className="btn btn-outline btn-sm" onClick={() => loadReviews(paper.id)}>
                  {expandedId === paper.id ? 'Hide Reviews' : '👁 View Reviews'}
                </button>
              </div>
            </div>

            {paper.status === 'revision' && (
              <div style={{ marginTop: 16, padding: 14, background: '#fffff0', borderRadius: 8, border: '1px solid #ecc94b' }}>
                <strong style={{ fontSize: 14 }}>⚠ Revision Required</strong>
                <p style={{ fontSize: 13, color: '#744210', margin: '6px 0' }}>Please review the comments below and resubmit your paper.</p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                  <input type="file" accept=".pdf" onChange={e => setResubFile(e.target.files[0])} style={{ fontSize: 13 }} />
                  <button className="btn btn-warning btn-sm" onClick={() => handleResubmit(paper.id)}>Resubmit</button>
                </div>
                {resubMsg[paper.id] && <div style={{ fontSize: 13, marginTop: 8, color: '#2d7d46' }}>{resubMsg[paper.id]}</div>}
              </div>
            )}

            {expandedId === paper.id && (
              <div style={{ marginTop: 16, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <h4 style={{ marginBottom: 12 }}>Reviewer Feedback</h4>
                {!reviews[paper.id] ? <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto' }} /> :
                  reviews[paper.id].length === 0
                    ? <p style={{ color: '#718096', fontSize: 14 }}>No reviews submitted yet.</p>
                    : reviews[paper.id].map((rev, i) => (
                      <div key={rev.id} style={{ background: '#f7f8fc', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, marginBottom: 10 }}>Review #{i + 1}</div>
                        <div className="score-bars">
                          {[['Originality', rev.originality_score],['Technical Quality', rev.technical_quality_score],['Clarity', rev.clarity_score],['Relevance', rev.relevance_score]].map(([label, score]) => (
                            <div className="score-bar-row" key={label}>
                              <div className="score-bar-label">{label}</div>
                              <div className="score-bar-track"><div className="score-bar-fill" style={{ width: `${score * 10}%` }} /></div>
                              <div className="score-bar-val">{score}/10</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 10, padding: 10, background: 'white', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#718096' }}>Comments: </span>
                          <span style={{ fontSize: 13 }}>{rev.comments || 'No comments provided.'}</span>
                        </div>
                        <div style={{ marginTop: 8, textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: '#1e3a5f' }}>Avg Score: {rev.total_score}/10</span>
                        </div>
                      </div>
                    ))
                }
              </div>
            )}
          </div>
        ))
      }
    </Layout>
  );
}
