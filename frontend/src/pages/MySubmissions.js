import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getMySubmissions, getPaperReviews, getPaperVersions, resubmitPaper } from '../services/api';

const downloadPaperVersion = async (paperId, versionNumber, fileName) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/papers/${paperId}/download?version=${versionNumber}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Unable to download this paper version');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default function MySubmissions() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reviews, setReviews] = useState({});
  const [versions, setVersions] = useState({});
  const [resubFile, setResubFile] = useState({});
  const [messages, setMessages] = useState({});

  const loadSubmissions = async () => {
    const response = await getMySubmissions();
    setPapers(response.data || []);
  };

  useEffect(() => {
    loadSubmissions()
      .finally(() => setLoading(false));
  }, []);

  const setPaperMessage = (paperId, type, text) => {
    setMessages((current) => ({ ...current, [paperId]: { type, text } }));
  };

  const loadPaperDetails = async (paperId) => {
    if (expandedId === paperId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(paperId);

    if (!reviews[paperId]) {
      const reviewResponse = await getPaperReviews(paperId);
      setReviews((current) => ({ ...current, [paperId]: reviewResponse.data || [] }));
    }

    if (!versions[paperId]) {
      const versionResponse = await getPaperVersions(paperId);
      setVersions((current) => ({ ...current, [paperId]: versionResponse.data || [] }));
    }
  };

  const handleResubmit = async (paperId) => {
    if (!resubFile[paperId]) {
      setPaperMessage(paperId, 'error', 'Select a PDF before uploading a revision.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('paper_id', paperId);
      formData.append('paper', resubFile[paperId]);

      const response = await resubmitPaper(formData);
      setPaperMessage(paperId, 'success', response.data.message);
      await loadSubmissions();

      const versionResponse = await getPaperVersions(paperId);
      setVersions((current) => ({ ...current, [paperId]: versionResponse.data || [] }));
    } catch (err) {
      setPaperMessage(paperId, 'error', err.response?.data?.message || 'Resubmission failed');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>My Submissions</h1>
        <p>Track status, reviewer feedback, and version history for your papers.</p>
      </div>

      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Link to="/submit" className="btn btn-accent">Submit New Paper</Link>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : papers.length === 0 ? (
        <div className="alert alert-info">
          No papers submitted yet. <Link to="/submit">Submit your first paper</Link>
        </div>
      ) : (
        papers.map((paper) => (
          <div className={`card ${paper.is_active ? '' : 'card-archived'}`} key={paper.id}>
            <div className="admin-paper-header">
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 17 }}>{paper.title}</h3>
                <div className="muted-copy" style={{ marginTop: 4 }}>
                  {paper.conference_title} | current version v{paper.version} | {paper.version_count || 1} total version(s)
                </div>
                {paper.keywords && (
                  <div className="muted-copy" style={{ marginTop: 6 }}>
                    Keywords: {paper.keywords}
                  </div>
                )}
              </div>

              <div className="inline-actions">
                <span className={`badge badge-${paper.status}`}>{paper.status.replace(/_/g, ' ')}</span>
                <button className="btn btn-outline btn-sm" onClick={() => loadPaperDetails(paper.id)}>
                  {expandedId === paper.id ? 'Hide Details' : 'View Details'}
                </button>
              </div>
            </div>

            {messages[paper.id] && (
              <div className={`alert alert-${messages[paper.id].type === 'success' ? 'success' : 'error'}`} style={{ marginTop: 14 }}>
                {messages[paper.id].text}
              </div>
            )}

            {paper.status === 'revision' && (
              <div className="status-panel status-panel-warning" style={{ marginTop: 16 }}>
                <strong>Revision required</strong>
                <p style={{ fontSize: 13, color: '#744210', margin: '6px 0 10px' }}>
                  Upload a revised PDF to create the next paper version while preserving the earlier ones.
                </p>
                <div className="inline-actions">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(event) => setResubFile((current) => ({ ...current, [paper.id]: event.target.files[0] }))}
                    style={{ fontSize: 13 }}
                  />
                  <button className="btn btn-warning btn-sm" onClick={() => handleResubmit(paper.id)}>
                    Upload New Version
                  </button>
                </div>
              </div>
            )}

            {expandedId === paper.id && (
              <div className="admin-paper-details">
                <div className="detail-grid">
                  <div>
                    <h4 style={{ marginBottom: 12 }}>Reviewer Feedback</h4>
                    {!reviews[paper.id] ? (
                      <div className="spinner" style={{ width: 24, height: 24, margin: 0 }} />
                    ) : reviews[paper.id].length === 0 ? (
                      <p className="muted-copy">No reviews submitted yet.</p>
                    ) : reviews[paper.id].map((review, index) => (
                      <div key={review.id} className="version-history-card">
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Review #{index + 1}</div>
                        <div className="score-bars">
                          {[
                            ['Originality', review.originality_score],
                            ['Technical Quality', review.technical_quality_score],
                            ['Clarity', review.clarity_score],
                            ['Relevance', review.relevance_score],
                          ].map(([label, score]) => (
                            <div className="score-bar-row" key={label}>
                              <div className="score-bar-label">{label}</div>
                              <div className="score-bar-track">
                                <div className="score-bar-fill" style={{ width: `${score * 10}%` }} />
                              </div>
                              <div className="score-bar-val">{score}/10</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 10, color: '#4a5568', fontSize: 13 }}>
                          {review.comments || 'No comments provided.'}
                        </div>
                        <div style={{ marginTop: 8, textAlign: 'right', fontWeight: 700, color: '#1e3a5f' }}>
                          Avg Score: {review.total_score}/10
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 style={{ marginBottom: 12 }}>Version History</h4>
                    {!versions[paper.id] ? (
                      <div className="spinner" style={{ width: 24, height: 24, margin: 0 }} />
                    ) : versions[paper.id].length === 0 ? (
                      <p className="muted-copy">No versions found.</p>
                    ) : versions[paper.id].map((version) => (
                      <div key={version.id} className="version-history-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontWeight: 700 }}>Version {version.version_number}</div>
                            <div className="muted-copy">
                              Uploaded {new Date(version.uploaded_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="inline-actions">
                            {version.is_current && <span className="badge badge-under_review">Current</span>}
                            {version.plagiarism_flagged && <span className="badge badge-flagged_for_review">Flagged</span>}
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => downloadPaperVersion(
                                paper.id,
                                version.version_number,
                                `${paper.title}-v${version.version_number}.pdf`
                              )}
                            >
                              Download PDF
                            </button>
                          </div>
                        </div>
                        <div className="muted-copy" style={{ marginTop: 8 }}>
                          Similarity score: {version.plagiarism_score ?? 'N/A'}%
                        </div>
                        {version.plagiarism_notes && (
                          <div className="muted-copy" style={{ marginTop: 6 }}>
                            {version.plagiarism_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </Layout>
  );
}
