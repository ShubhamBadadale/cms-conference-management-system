// controllers/analyticsController.js
// Feature 8 — Analytics Views + Feature 7 Reviewer Workload

const db = require('../config/db');

/**
 * GET /api/analytics/paper-summary
 * Admin: Uses paper_review_summary view — total reviews, avg score per paper.
 */
const getPaperReviewSummary = async (req, res) => {
  try {
    const { conference_id } = req.query;
    let query = 'SELECT * FROM paper_review_summary';
    const params = [];
    if (conference_id) {
      query += ' WHERE conference_id = ?';
      params.push(conference_id);
    }
    query += ' ORDER BY average_score DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/analytics/reviewer-workload
 * Admin: Uses reviewer_workload view — papers assigned vs reviewed per reviewer.
 */
const getReviewerWorkload = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM reviewer_workload ORDER BY assigned_papers DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/analytics/conference-stats/:conference_id
 * Admin: Detailed stats for one conference.
 */
const getConferenceStats = async (req, res) => {
  try {
    const { conference_id } = req.params;

    const [[conf]] = await db.query('SELECT * FROM Conferences WHERE id = ?', [conference_id]);
    if (!conf) return res.status(404).json({ message: 'Conference not found' });

    const [[counts]] = await db.query(
      `SELECT
         COUNT(*) AS total_papers,
         SUM(status = 'submitted')    AS submitted,
         SUM(status = 'under_review') AS under_review,
         SUM(status = 'revision')     AS revision,
         SUM(status = 'accepted')     AS accepted,
         SUM(status = 'rejected')     AS rejected
       FROM Papers WHERE conference_id = ?`,
      [conference_id]
    );

    const [[reviewStats]] = await db.query(
      `SELECT COUNT(DISTINCT r.id) AS total_reviews,
              ROUND(AVG(r.total_score), 2) AS avg_score
       FROM Papers p
       JOIN Reviews r ON p.id = r.paper_id
       WHERE p.conference_id = ?`,
      [conference_id]
    );

    const [topPapers] = await db.query(
      `SELECT prs.paper_id, prs.title, prs.author_name,
              prs.total_reviews, prs.average_score
       FROM paper_review_summary prs
       WHERE prs.conference_id = ? AND prs.status = 'accepted'
       ORDER BY prs.average_score DESC LIMIT 5`,
      [conference_id]
    );

    res.json({
      conference: conf,
      paper_counts: counts,
      review_stats: reviewStats,
      top_accepted_papers: topPapers
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/analytics/decisions
 * Admin: Full decision trail from the Decisions table (Feature 6).
 */
const getDecisionTrail = async (req, res) => {
  try {
    const { paper_id } = req.query;
    let query = `
      SELECT d.*, p.title AS paper_title, u.name AS decided_by_name, u.email
      FROM Decisions d
      JOIN Papers p ON d.paper_id = p.id
      JOIN Users  u ON d.decided_by = u.id
    `;
    const params = [];
    if (paper_id) {
      query += ' WHERE d.paper_id = ?';
      params.push(paper_id);
    }
    query += ' ORDER BY d.decided_at DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getPaperReviewSummary, getReviewerWorkload, getConferenceStats, getDecisionTrail };
