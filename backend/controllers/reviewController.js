const db = require('../config/db');

const getDbErrorMessage = (err) => err.sqlMessage || err.message || 'Server error';

const getReviewErrorStatus = (message) => {
  if (message.includes('assigned')) return 403;
  if (message.includes('reviewer role')) return 403;
  if (message.includes('Paper not found')) return 400;
  if (message.includes('required')) return 400;
  return 500;
};

const parseScore = (score) => {
  const parsed = Number(score);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidScore = (score) => score !== null && score >= 0 && score <= 10;

const getAssignedPapers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.name as author_name, u.institution, c.title as conference_title,
       ra.assigned_date,
       (SELECT COUNT(*) FROM Reviews r WHERE r.paper_id = p.id AND r.reviewer_id = ?) as reviewed
       FROM ReviewerAssignments ra 
       JOIN Papers p ON ra.paper_id = p.id 
       JOIN Users u ON p.author_id = u.id 
       JOIN Conferences c ON p.conference_id = c.id
       WHERE ra.reviewer_id = ?`,
      [req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getReviewerWorkload = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM vw_reviewer_workload WHERE reviewer_id = ?',
      [req.user.id]
    );

    res.json(rows[0] || {
      reviewer_id: req.user.id,
      reviewer_name: req.user.name,
      assigned_count: 0,
      completed_count: 0,
      pending_count: 0,
      avg_score_given: null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const submitReview = async (req, res) => {
  try {
    const { paper_id, originality_score, technical_quality_score, clarity_score, relevance_score, comments } = req.body;

    if (!paper_id) {
      return res.status(400).json({ message: 'paper_id is required' });
    }

    const scores = [
      parseScore(originality_score),
      parseScore(technical_quality_score),
      parseScore(clarity_score),
      parseScore(relevance_score),
    ];

    if (!scores.every(isValidScore)) {
      return res.status(400).json({ message: 'Scores must be numbers between 0 and 10' });
    }

    await db.query('CALL sp_submit_review_atomic(?, ?, ?, ?, ?, ?, ?)', [
      paper_id,
      req.user.id,
      scores[0],
      scores[1],
      scores[2],
      scores[3],
      comments || null,
    ]);

    res.status(201).json({ message: 'Review submitted successfully' });
  } catch (err) {
    const message = getDbErrorMessage(err);
    res.status(getReviewErrorStatus(message)).json({ message, error: err.message });
  }
};

const getReviewsForPaper = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.name as reviewer_name FROM Reviews r 
       JOIN Users u ON r.reviewer_id = u.id WHERE r.paper_id = ?`,
      [req.params.paper_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getAssignedPapers, getReviewerWorkload, submitReview, getReviewsForPaper };
