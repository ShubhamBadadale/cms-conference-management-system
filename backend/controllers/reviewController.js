const db = require('../config/db');
const { normalizeKeywords } = require('../services/paperVersionService');

const validExpertiseLevels = ['basic', 'intermediate', 'expert'];
const finalStatuses = new Set(['accepted', 'rejected']);

const parseScore = (score) => {
  const parsed = Number(score);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidScore = (score) => score !== null && score >= 0 && score <= 10;

const getAssignedPapers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        p.*,
        u.name AS author_name,
        u.institution,
        c.title AS conference_title,
        ra.assigned_date,
        (
          SELECT COUNT(*)
          FROM Reviews r
          WHERE r.paper_id = p.id AND r.reviewer_id = ?
        ) AS reviewed
       FROM ReviewerAssignments ra
       JOIN Papers p ON ra.paper_id = p.id
       JOIN Users u ON p.author_id = u.id
       JOIN Conferences c ON p.conference_id = c.id
       WHERE ra.reviewer_id = ?
         AND p.is_active = TRUE
         AND u.is_active = TRUE
         AND c.is_active = TRUE
       ORDER BY ra.assigned_date DESC`,
      [req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getReviewerWorkload = async (req, res) => {
  try {
    const [[stats]] = await db.query(
      `SELECT
        ? AS reviewer_id,
        ? AS reviewer_name,
        COUNT(DISTINCT CASE WHEN p.is_active = TRUE THEN ra.paper_id END) AS assigned_count,
        COUNT(DISTINCT r.paper_id) AS completed_count,
        GREATEST(COUNT(DISTINCT CASE WHEN p.is_active = TRUE THEN ra.paper_id END) - COUNT(DISTINCT r.paper_id), 0) AS pending_count,
        ROUND(AVG(r.total_score), 2) AS avg_score_given
       FROM ReviewerAssignments ra
       LEFT JOIN Papers p ON p.id = ra.paper_id
       LEFT JOIN Reviews r ON r.paper_id = ra.paper_id AND r.reviewer_id = ra.reviewer_id
       WHERE ra.reviewer_id = ?`,
      [req.user.id, req.user.name, req.user.id]
    );

    res.json(stats || {
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
  const connection = await db.getConnection();

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

    await connection.beginTransaction();

    const [papers] = await connection.query(
      `SELECT id, title, author_id, status
       FROM Papers
       WHERE id = ? AND is_active = TRUE
       FOR UPDATE`,
      [paper_id]
    );

    if (papers.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Paper not found' });
    }

    if (finalStatuses.has(papers[0].status)) {
      await connection.rollback();
      return res.status(409).json({
        message: 'This paper has been finalized. Reviews can no longer be submitted or updated.',
      });
    }

    const [assignments] = await connection.query(
      `SELECT id
       FROM ReviewerAssignments
       WHERE paper_id = ? AND reviewer_id = ?`,
      [paper_id, req.user.id]
    );

    if (assignments.length === 0) {
      await connection.rollback();
      return res.status(403).json({ message: 'You are not assigned to this paper' });
    }

    const totalScore = Number(((scores[0] + scores[1] + scores[2] + scores[3]) / 4).toFixed(2));
    const [existingReviews] = await connection.query(
      'SELECT id FROM Reviews WHERE paper_id = ? AND reviewer_id = ?',
      [paper_id, req.user.id]
    );

    if (existingReviews.length > 0) {
      await connection.query(
        `UPDATE Reviews
         SET originality_score = ?, technical_quality_score = ?, clarity_score = ?,
             relevance_score = ?, total_score = ?, comments = ?, review_date = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          scores[0],
          scores[1],
          scores[2],
          scores[3],
          totalScore,
          comments || null,
          existingReviews[0].id,
        ]
      );
    } else {
      await connection.query(
        `INSERT INTO Reviews (
          paper_id,
          reviewer_id,
          originality_score,
          technical_quality_score,
          clarity_score,
          relevance_score,
          total_score,
          comments
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [paper_id, req.user.id, scores[0], scores[1], scores[2], scores[3], totalScore, comments || null]
      );
    }

    if (papers[0].status === 'submitted') {
      await connection.query(
        "UPDATE Papers SET status = 'under_review' WHERE id = ?",
        [paper_id]
      );
    }

    await connection.query(
      'INSERT INTO Notifications (user_id, message) VALUES (?, ?)',
      [papers[0].author_id, `Your paper "${papers[0].title}" has received a review.`]
    );

    await connection.commit();
    res.status(201).json({ message: 'Review submitted successfully', total_score: totalScore });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
};

const getReviewsForPaper = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.name AS reviewer_name
       FROM Reviews r
       JOIN Users u ON r.reviewer_id = u.id
       WHERE r.paper_id = ?
       ORDER BY r.review_date DESC`,
      [req.params.paper_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getReviewerExpertise = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT reviewer_id, keyword, expertise_level
       FROM ReviewerExpertise
       WHERE reviewer_id = ?
       ORDER BY keyword ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateReviewerExpertise = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const expertise = Array.isArray(req.body?.expertise) ? req.body.expertise : [];
    const normalizedEntries = expertise
      .flatMap((entry) => normalizeKeywords(entry.keyword).map((keyword) => ({
        keyword,
        expertise_level: validExpertiseLevels.includes(entry.expertise_level)
          ? entry.expertise_level
          : 'intermediate',
      })));

    await connection.beginTransaction();
    await connection.query('DELETE FROM ReviewerExpertise WHERE reviewer_id = ?', [req.user.id]);

    for (const entry of normalizedEntries) {
      await connection.query(
        `INSERT INTO ReviewerExpertise (reviewer_id, keyword, expertise_level)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE expertise_level = VALUES(expertise_level)`,
        [req.user.id, entry.keyword, entry.expertise_level]
      );
    }

    await connection.commit();
    res.json({
      message: 'Reviewer expertise updated successfully',
      expertise: normalizedEntries,
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
};

module.exports = {
  getAssignedPapers,
  getReviewerExpertise,
  getReviewerWorkload,
  getReviewsForPaper,
  submitReview,
  updateReviewerExpertise,
};
