const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const decisionContent = {
  accepted: {
    accent: '#276749',
    title: 'Your paper has been accepted',
    body: 'Congratulations. Your submission has been accepted. Reviewer scores and comments are included below for your records.',
    footer: 'Please sign in to ConferMS for any next steps, certificate updates, and final conference instructions.',
  },
  rejected: {
    accent: '#c53030',
    title: 'Your paper was not accepted',
    body: 'Thank you for submitting to the conference. The editorial decision is rejection, and the reviewer feedback is included below to help with your next revision outside this cycle.',
    footer: 'You can still review the decision details inside ConferMS.',
  },
  revision: {
    accent: '#975a16',
    title: 'Revision requested for your paper',
    body: 'Your paper needs revision before a final decision can be made. Please review the scores and comments below, then upload a revised PDF in ConferMS.',
    footer: 'Sign in to ConferMS to submit the next version when you are ready.',
  },
};

const renderReviewCard = (review, index) => `
  <div style="border:1px solid #dbeafe;border-radius:14px;padding:16px;margin-top:14px;background:#f8fbff;">
    <h3 style="margin:0 0 12px;font-size:16px;color:#1e3a5f;">Reviewer ${index + 1}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
      <tr><td style="padding:4px 0;">Originality</td><td style="padding:4px 0;text-align:right;font-weight:700;">${escapeHtml(review.originality_score)}/10</td></tr>
      <tr><td style="padding:4px 0;">Technical Quality</td><td style="padding:4px 0;text-align:right;font-weight:700;">${escapeHtml(review.technical_quality_score)}/10</td></tr>
      <tr><td style="padding:4px 0;">Clarity</td><td style="padding:4px 0;text-align:right;font-weight:700;">${escapeHtml(review.clarity_score)}/10</td></tr>
      <tr><td style="padding:4px 0;">Relevance</td><td style="padding:4px 0;text-align:right;font-weight:700;">${escapeHtml(review.relevance_score)}/10</td></tr>
      <tr><td style="padding:4px 0;">Average</td><td style="padding:4px 0;text-align:right;font-weight:700;">${escapeHtml(review.total_score)}/10</td></tr>
    </table>
    <div style="margin-top:12px;padding:12px;border-radius:10px;background:#ffffff;border:1px solid #e2e8f0;color:#475569;">
      <strong style="display:block;margin-bottom:6px;color:#1f2937;">Comments</strong>
      <div>${escapeHtml(review.comments || 'No comments provided.')}</div>
    </div>
  </div>
`;

const renderReviewFeedbackEmail = (payload) => {
  const reviews = Array.isArray(payload?.reviews) ? payload.reviews : [];
  const decisionKey = payload?.decision && decisionContent[payload.decision]
    ? payload.decision
    : 'revision';
  const content = decisionContent[decisionKey];
  const reviewCards = reviews.length === 0
    ? '<p style="margin:0;color:#475569;">No reviewer feedback was available at the time of this decision.</p>'
    : reviews.map(renderReviewCard).join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:24px;background:#f8fafc;color:#1f2937;">
      <div style="background:#ffffff;border-radius:20px;padding:24px;border:1px solid #dbeafe;">
        <p style="margin:0 0 12px;font-size:14px;color:#475569;">Hello ${escapeHtml(payload.authorName)},</p>
        <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:${content.accent};color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;">
          ${escapeHtml(payload.decisionLabel || decisionKey)}
        </div>
        <h1 style="margin:14px 0 10px;font-size:26px;color:#1e3a5f;">${escapeHtml(content.title)}</h1>
        <p style="margin:0 0 8px;font-size:15px;"><strong>Paper Title:</strong> ${escapeHtml(payload.paperTitle)}</p>
        <p style="margin:0 0 18px;font-size:15px;"><strong>Conference:</strong> ${escapeHtml(payload.conferenceTitle)}</p>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">
          ${escapeHtml(content.body)}
        </p>
        <div style="margin:0 0 16px;padding:14px 16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
          <strong style="display:block;margin-bottom:6px;color:#1f2937;">Reviewer Summary</strong>
          <span style="font-size:13px;color:#64748b;">
            The numerical scores and qualitative feedback recorded at decision time are included below.
          </span>
        </div>
        ${reviewCards}
        <p style="margin:18px 0 0;font-size:13px;color:#64748b;">
          ${escapeHtml(content.footer)}
        </p>
      </div>
    </div>
  `;
};

module.exports = { renderReviewFeedbackEmail };
