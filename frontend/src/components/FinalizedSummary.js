import React from 'react';

const formatDateTime = (value) => (
  value ? new Date(value).toLocaleString() : 'Not available'
);

export default function FinalizedSummary({
  paper,
  reviews,
  onGenerateCertificate,
  onRevokeDecision,
  generatingCertificate = false,
  revokingDecision = false,
}) {
  const averageScore = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + Number(review.total_score || 0), 0) / reviews.length).toFixed(2)
    : null;

  return (
    <div className="finalized-summary">
      <div className="finalized-banner">
        <div>
          <strong>Finalized Summary</strong>
          <p>This paper has a final acceptance decision. Revoke the decision to reopen the workflow.</p>
        </div>
        <span className="badge badge-accepted">Finalized</span>
      </div>

      <div className="finalized-grid">
        <div className="version-history-card">
          <h4>Paper Snapshot</h4>
          <p className="muted-copy" style={{ marginTop: 10, lineHeight: 1.7 }}>
            {paper.abstract || 'No abstract provided for this submission.'}
          </p>
        </div>

        <div className="version-history-card">
          <h4>Review Summary</h4>
          <div className="finalized-metric">
            <span>Average Score</span>
            <strong>{averageScore == null ? 'N/A' : `${averageScore}/10`}</strong>
          </div>
          <div className="finalized-metric">
            <span>Total Reviews</span>
            <strong>{reviews.length}</strong>
          </div>
          <div className="finalized-metric">
            <span>Certificate</span>
            <strong>{paper.has_certificate ? 'Generated' : 'Pending'}</strong>
          </div>
          {paper.has_certificate && (
            <p className="muted-copy" style={{ marginTop: 10 }}>
              Generated on {formatDateTime(paper.certificate_generated_date)}
            </p>
          )}
          <div className="inline-actions" style={{ marginTop: 16 }}>
            {!paper.has_certificate && (
              <button
                type="button"
                className="btn btn-accent btn-sm"
                onClick={onGenerateCertificate}
                disabled={generatingCertificate || !paper.is_active}
              >
                {generatingCertificate ? 'Generating...' : 'Generate Certificate'}
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onRevokeDecision}
              disabled={revokingDecision}
            >
              {revokingDecision ? 'Revoking...' : 'Revoke Decision'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h4 style={{ marginBottom: 12 }}>Reviewer Comments</h4>
        {reviews.length === 0 ? (
          <p className="muted-copy">No reviewer comments were available when this decision was made.</p>
        ) : (
          <div className="version-list">
            {reviews.map((review, index) => (
              <div className="version-history-card" key={review.id || `${paper.id}-${index}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <strong>{review.reviewer_name || `Reviewer ${index + 1}`}</strong>
                  <span style={{ fontWeight: 700, color: '#1e3a5f' }}>
                    Avg {review.total_score}/10
                  </span>
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
                <p style={{ marginTop: 12, color: '#4a5568', fontSize: 13 }}>
                  {review.comments || 'No comments provided.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
