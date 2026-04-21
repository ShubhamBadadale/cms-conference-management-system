import React, { useEffect, useMemo, useState } from 'react';
import DocumentViewer from '../components/DocumentViewer';
import FinalizedSummary from '../components/FinalizedSummary';
import Layout from '../components/Layout';
import {
  assignReviewer,
  generateCertificate,
  getAllSubmissions,
  getPaperDocumentBlob,
  getPaperVersions,
  getReviewerSuggestions,
  getReviewers,
  getReviewsForPaper,
  makeDecision,
  revokeDecision,
  updatePaperActiveState,
} from '../services/api';

const filters = [
  { value: 'all', label: 'All' },
  { value: 'flagged_for_review', label: 'Flagged' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'revision', label: 'Revision' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

const finalStatuses = new Set(['accepted', 'rejected']);

const getFilterCount = (papers, filter) => {
  if (filter === 'all') {
    return papers.length;
  }

  if (filter === 'archived') {
    return papers.filter((paper) => !paper.is_active).length;
  }

  return papers.filter((paper) => paper.status === filter && paper.is_active).length;
};

const buildPaperFileName = (paperTitle, versionNumber) => {
  const safeTitle = String(paperTitle || 'paper')
    .replace(/[^a-z0-9-_]+/gi, '_')
    .replace(/^_+|_+$/g, '');

  return `${safeTitle || 'paper'}-v${versionNumber}.pdf`;
};

export default function AdminSubmissions() {
  const [papers, setPapers] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reviews, setReviews] = useState({});
  const [versions, setVersions] = useState({});
  const [suggestions, setSuggestions] = useState({});
  const [assignRevId, setAssignRevId] = useState({});
  const [messages, setMessages] = useState({});
  const [filter, setFilter] = useState('all');
  const [previewVersions, setPreviewVersions] = useState({});
  const [actionState, setActionState] = useState({});

  const setActionBusy = (paperId, action, value) => {
    setActionState((current) => ({
      ...current,
      [paperId]: {
        ...current[paperId],
        [action]: value,
      },
    }));
  };

  const load = async () => {
    const [papersResponse, reviewersResponse] = await Promise.all([
      getAllSubmissions(),
      getReviewers(),
    ]);

    setPapers(papersResponse.data || []);
    setReviewers(reviewersResponse.data || []);
  };

  useEffect(() => {
    load()
      .finally(() => setLoading(false));
  }, []);

  const activeReviewers = useMemo(
    () => reviewers.filter((reviewer) => reviewer.is_active),
    [reviewers]
  );

  const filteredPapers = useMemo(() => {
    if (filter === 'all') {
      return papers;
    }

    if (filter === 'archived') {
      return papers.filter((paper) => !paper.is_active);
    }

    return papers.filter((paper) => paper.is_active && paper.status === filter);
  }, [filter, papers]);

  const setPaperMessage = (paperId, type, text) => {
    setMessages((current) => ({ ...current, [paperId]: { type, text } }));
  };

  const loadPaperDetails = async (paper) => {
    if (expandedId === paper.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(paper.id);

    const tasks = [];

    if (!reviews[paper.id]) {
      tasks.push(
        getReviewsForPaper(paper.id).then((response) => {
          setReviews((current) => ({ ...current, [paper.id]: response.data || [] }));
        })
      );
    }

    if (!versions[paper.id]) {
      tasks.push(
        getPaperVersions(paper.id).then((response) => {
          const loadedVersions = response.data || [];
          setVersions((current) => ({ ...current, [paper.id]: loadedVersions }));
          setPreviewVersions((current) => ({
            ...current,
            [paper.id]: current[paper.id] || loadedVersions.find((version) => version.is_current)?.version_number || paper.version,
          }));
        })
      );
    } else if (!previewVersions[paper.id]) {
      setPreviewVersions((current) => ({
        ...current,
        [paper.id]: versions[paper.id].find((version) => version.is_current)?.version_number || paper.version,
      }));
    }

    if (!suggestions[paper.id]) {
      tasks.push(
        getReviewerSuggestions(paper.id)
          .then((response) => {
            setSuggestions((current) => ({ ...current, [paper.id]: response.data || [] }));
          })
          .catch(() => {
            setSuggestions((current) => ({ ...current, [paper.id]: [] }));
          })
      );
    }

    await Promise.all(tasks);
  };

  const handleDecision = async (paperId, status) => {
    try {
      await makeDecision({ paper_id: paperId, status });
      setPaperMessage(paperId, 'success', `Paper marked as ${status.replace(/_/g, ' ')}.`);
      await load();
    } catch (err) {
      setPaperMessage(paperId, 'error', err.response?.data?.message || 'Failed to update paper decision');
    }
  };

  const handleRevokeDecision = async (paperId) => {
    setActionBusy(paperId, 'revoke', true);

    try {
      await revokeDecision(paperId);
      setPaperMessage(paperId, 'success', 'Decision revoked. Paper is back under review.');
      await load();
    } catch (err) {
      setPaperMessage(paperId, 'error', err.response?.data?.message || 'Failed to revoke the decision');
    } finally {
      setActionBusy(paperId, 'revoke', false);
    }
  };

  const handleAssign = async (paperId) => {
    const reviewerId = assignRevId[paperId];

    if (!reviewerId) {
      setPaperMessage(paperId, 'error', 'Choose a reviewer first.');
      return;
    }

    try {
      await assignReviewer({ paper_id: paperId, reviewer_id: reviewerId });
      setPaperMessage(paperId, 'success', 'Reviewer assigned successfully.');
      setSuggestions((current) => {
        const next = { ...current };
        delete next[paperId];
        return next;
      });
      await load();
    } catch (err) {
      setPaperMessage(paperId, 'error', err.response?.data?.message || 'Failed to assign reviewer');
    }
  };

  const handleCertificate = async (paperId) => {
    setActionBusy(paperId, 'certificate', true);

    try {
      await generateCertificate({ paper_id: paperId });
      setPaperMessage(paperId, 'success', 'Certificate generated successfully.');
      await load();
    } catch (err) {
      setPaperMessage(paperId, 'error', err.response?.data?.message || 'Failed to generate certificate');
    } finally {
      setActionBusy(paperId, 'certificate', false);
    }
  };

  const handleActiveToggle = async (paper) => {
    try {
      await updatePaperActiveState(paper.id, !paper.is_active);
      setPaperMessage(
        paper.id,
        'success',
        `Paper ${paper.is_active ? 'archived' : 'reactivated'} successfully.`
      );
      await load();
    } catch (err) {
      setPaperMessage(paper.id, 'error', err.response?.data?.message || 'Failed to update paper state');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>All Submissions</h1>
        <p>Review papers, inspect version history, and enforce the final decision workflow.</p>
      </div>

      <div className="tabs">
        {filters.map((tab) => (
          <button
            key={tab.value}
            className={`tab-btn${filter === tab.value ? ' active' : ''}`}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label} ({getFilterCount(papers, tab.value)})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="spinner" />
      ) : filteredPapers.length === 0 ? (
        <div className="alert alert-info">No papers match the selected filter.</div>
      ) : (
        filteredPapers.map((paper) => {
          const isFinalized = finalStatuses.has(paper.status);
          const paperReviews = reviews[paper.id] || [];
          const paperVersions = versions[paper.id] || [];
          const selectedVersionNumber = previewVersions[paper.id] || paper.version;
          const selectedVersion = paperVersions.find((version) => version.version_number === selectedVersionNumber);

          return (
            <div className={`card ${paper.is_active ? '' : 'card-archived'}`} key={paper.id}>
              <div className="admin-paper-header">
                <div style={{ flex: 1, minWidth: 260 }}>
                  <h3 style={{ fontSize: 17 }}>{paper.title}</h3>
                  <div className="muted-copy" style={{ marginTop: 4 }}>
                    {paper.author_name} {paper.institution ? `(${paper.institution})` : ''} | {paper.conference_title}
                  </div>
                  <div className="muted-copy" style={{ marginTop: 6 }}>
                    Current version v{paper.version} | {paper.version_count || 1} total version(s)
                  </div>
                  {paper.keywords && (
                    <div className="muted-copy" style={{ marginTop: 6 }}>
                      Keywords: {paper.keywords}
                    </div>
                  )}
                </div>

                <div className="stacked-actions">
                  <div className="inline-actions">
                    <span className={`badge badge-${paper.status}`}>{paper.status.replace(/_/g, ' ')}</span>
                    <span className={`badge ${paper.is_active ? 'badge-active' : 'badge-archived'}`}>
                      {paper.is_active ? 'Active' : 'Archived'}
                    </span>
                  </div>
                  <div className="inline-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => loadPaperDetails(paper)}>
                      {expandedId === paper.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>
              </div>

              {messages[paper.id] && (
                <div className={`alert alert-${messages[paper.id].type === 'success' ? 'success' : 'error'}`} style={{ marginTop: 14 }}>
                  {messages[paper.id].text}
                </div>
              )}

              <div className="admin-paper-toolbar">
                <div className="inline-actions">
                  <strong className="table-note">Decision</strong>
                  <button
                    className="btn btn-success btn-sm"
                    disabled={!paper.is_active || isFinalized}
                    onClick={() => handleDecision(paper.id, 'accepted')}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={!paper.is_active || isFinalized}
                    onClick={() => handleDecision(paper.id, 'rejected')}
                  >
                    Reject
                  </button>
                  <button
                    className="btn btn-warning btn-sm"
                    disabled={!paper.is_active || isFinalized}
                    onClick={() => handleDecision(paper.id, 'revision')}
                  >
                    Request Revision
                  </button>
                  {isFinalized && (
                    <span className="muted-copy">Finalized decisions must be revoked before any change.</span>
                  )}
                </div>

                <div className="inline-actions">
                  <strong className="table-note">Assign Reviewer</strong>
                  <select
                    className="form-control admin-select"
                    value={assignRevId[paper.id] || ''}
                    onChange={(event) => setAssignRevId((current) => ({ ...current, [paper.id]: event.target.value }))}
                    disabled={!paper.is_active || isFinalized}
                  >
                    <option value="">Select reviewer...</option>
                    {activeReviewers.map((reviewer) => (
                      <option key={reviewer.id} value={reviewer.id}>
                        {reviewer.name} ({reviewer.assigned_count} assigned)
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!paper.is_active || isFinalized}
                    onClick={() => handleAssign(paper.id)}
                  >
                    Assign
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleActiveToggle(paper)}>
                    {paper.is_active ? 'Archive' : 'Reactivate'}
                  </button>
                </div>
              </div>

              {expandedId === paper.id && (
                <div className="admin-paper-details">
                  <DocumentViewer
                    title={selectedVersion ? `Paper Preview - Version ${selectedVersion.version_number}` : 'Paper Preview'}
                    description="Read the submission inline. Use the separate download button if you need the file locally."
                    fileName={buildPaperFileName(paper.title, selectedVersionNumber)}
                    documentKey={`${paper.id}-${selectedVersionNumber}`}
                    loadDocument={() => getPaperDocumentBlob(paper.id, selectedVersionNumber)}
                  />

                  {paper.status === 'accepted' && (
                    <div style={{ marginTop: 20 }}>
                      {!reviews[paper.id] ? (
                        <div className="version-history-card">
                          <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto' }} />
                        </div>
                      ) : (
                        <FinalizedSummary
                          paper={paper}
                          reviews={paperReviews}
                          generatingCertificate={Boolean(actionState[paper.id]?.certificate)}
                          revokingDecision={Boolean(actionState[paper.id]?.revoke)}
                          onGenerateCertificate={() => handleCertificate(paper.id)}
                          onRevokeDecision={() => handleRevokeDecision(paper.id)}
                        />
                      )}
                    </div>
                  )}

                  {paper.status === 'rejected' && (
                    <div className="status-panel status-panel-locked" style={{ marginTop: 20 }}>
                      <strong>Decision Locked</strong>
                      <p style={{ margin: '6px 0 10px', color: '#4a5568', fontSize: 13 }}>
                        This paper has a final rejection decision. Revoke the decision to return it to under review.
                      </p>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleRevokeDecision(paper.id)}
                        disabled={Boolean(actionState[paper.id]?.revoke)}
                      >
                        {actionState[paper.id]?.revoke ? 'Revoking...' : 'Revoke Decision'}
                      </button>
                    </div>
                  )}

                  <div className="detail-grid" style={{ marginTop: 20 }}>
                    <div>
                      <h4 style={{ marginBottom: 12 }}>Reviewer Suggestions</h4>
                      {!suggestions[paper.id] ? (
                        <div className="spinner" style={{ width: 24, height: 24, margin: 0 }} />
                      ) : suggestions[paper.id].length === 0 ? (
                        <p className="muted-copy">No eligible reviewer suggestions available.</p>
                      ) : (
                        <div className="reviewer-suggestion-grid">
                          {suggestions[paper.id].map((suggestion) => (
                            <div className="reviewer-suggestion-card" key={suggestion.reviewer_id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                <div>
                                  <div style={{ fontWeight: 700 }}>{suggestion.reviewer_name}</div>
                                  <div className="muted-copy">{suggestion.institution || suggestion.reviewer_email}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: 700, color: '#1e3a5f' }}>{suggestion.match_score}</div>
                                  <div className="muted-copy">match score</div>
                                </div>
                              </div>
                              <div className="muted-copy" style={{ marginTop: 10 }}>
                                Overlap: {suggestion.overlap_count} | Expertise weight: {suggestion.expertise_weight} | Pending: {suggestion.pending_count}
                              </div>
                              {suggestion.matched_keywords.length > 0 && (
                                <div className="keyword-chip-wrap" style={{ marginTop: 10 }}>
                                  {suggestion.matched_keywords.map((keyword) => (
                                    <span className="keyword-chip" key={`${suggestion.reviewer_id}-${keyword.keyword}`}>
                                      {keyword.keyword} ({keyword.expertise_level})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {paper.status !== 'accepted' && (
                      <div>
                        <h4 style={{ marginBottom: 12 }}>Reviews</h4>
                        {!reviews[paper.id] ? (
                          <div className="spinner" style={{ width: 24, height: 24, margin: 0 }} />
                        ) : paperReviews.length === 0 ? (
                          <p className="muted-copy">No reviews submitted yet.</p>
                        ) : paperReviews.map((review) => (
                          <div key={review.id} className="version-history-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                              <strong>{review.reviewer_name}</strong>
                              <span style={{ fontWeight: 700, color: '#1e3a5f' }}>Avg {review.total_score}/10</span>
                            </div>
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
                                    <div className="score-bar-fill" style={{ width: `${Number(score || 0) * 10}%` }} />
                                  </div>
                                  <div className="score-bar-val">{score}/10</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: 10, color: '#4a5568', fontSize: 13 }}>
                              {review.comments || 'No comments provided.'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <h4 style={{ marginBottom: 12 }}>Version History</h4>
                    {!versions[paper.id] ? (
                      <div className="spinner" style={{ width: 24, height: 24, margin: 0 }} />
                    ) : paperVersions.length === 0 ? (
                      <p className="muted-copy">No paper versions found.</p>
                    ) : (
                      <div className="version-list">
                        {paperVersions.map((version) => (
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
                                  type="button"
                                  className={`btn btn-sm ${selectedVersionNumber === version.version_number ? 'btn-primary' : 'btn-outline'}`}
                                  onClick={() => setPreviewVersions((current) => ({
                                    ...current,
                                    [paper.id]: version.version_number,
                                  }))}
                                >
                                  {selectedVersionNumber === version.version_number ? 'Viewing' : 'Preview Version'}
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
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </Layout>
  );
}
