// controllers/reviewController.js
// Modified for: Feature 3 (Double-Blind via reviewer_papers view)

const db = require('../config/db');

/**
 * GET /api/reviews/assigned
 * Feature 3 — Double Blind: uses reviewer_papers VIEW so author identity is hidden.
 */
const getAssignedPapers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         rp.paper_id   AS id,
         rp.title,
         rp.abstract,
         rp.keywords,
         rp.conference_title,
         rp.status,
         rp.version,
         ra.assigned_date,
         (SELECT COUNT(*) FROM Reviews r
          WHERE r.paper_id = rp.paper_id AND r.reviewer_id = ?) AS reviewed,
         COALESCE(b.bid_level, 'not_bid') AS my_bid
       FROM ReviewerAssignments ra
       JOIN reviewer_papers rp ON ra.paper_id = rp.paper_id
       LEFT JOIN Bids b ON rp.paper_id = b.paper_id AND b.reviewer_id = ?
       WHERE ra.reviewer_id = ?
       ORDER BY ra.assigned_date DESC`,
      [req.user.id, req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const submitReview = async (req, res) => {
  try {
    const {
      paper_id, originality_score, technical_quality_score,
      clarity_score, relevance_score, comments
    } = req.body;

    // Verify assignment
    const [assigned] = await db.query(
      'SELECT id FROM ReviewerAssignments WHERE paper_id = ? AND reviewer_id = ?',
      [paper_id, req.user.id]
    );
    if (assigned.length === 0) {
      return res.status(403).json({ message: 'Not assigned to this paper' });
    }

    const total = (
      Number(originality_score) + Number(technical_quality_score) +
      Number(clarity_score) + Number(relevance_score)
    ) / 4;

    const [existing] = await db.query(
      'SELECT id FROM Reviews WHERE paper_id = ? AND reviewer_id = ?',
      [paper_id, req.user.id]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE Reviews SET originality_score=?, technical_quality_score=?, clarity_score=?,
         relevance_score=?, total_score=?, comments=?, review_date=NOW()
         WHERE paper_id=? AND reviewer_id=?`,
        [originality_score, technical_quality_score, clarity_score,
         relevance_score, total, comments, paper_id, req.user.id]
      );
      return res.json({ message: 'Review updated successfully' });
    }

    await db.query(
      `INSERT INTO Reviews
         (paper_id, reviewer_id, originality_score, technical_quality_score,
          clarity_score, relevance_score, total_score, comments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [paper_id, req.user.id, originality_score, technical_quality_score,
       clarity_score, relevance_score, total, comments]
    );

    await db.query(
      "UPDATE Papers SET status = 'under_review' WHERE id = ? AND status = 'submitted'",
      [paper_id]
    );

    // Notify author (identity safe — notification doesn't reveal reviewer)
    const [paper] = await db.query('SELECT * FROM Papers WHERE id = ?', [paper_id]);
    await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)',
      [paper[0].author_id, `Your paper "${paper[0].title}" has received a new review.`]);

    res.status(201).json({ message: 'Review submitted successfully', total_score: total });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getReviewsForPaper = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.name as reviewer_name
       FROM Reviews r
       JOIN Users u ON r.reviewer_id = u.id
       WHERE r.paper_id = ?`,
      [req.params.paper_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getAssignedPapers, submitReview, getReviewsForPaper };
