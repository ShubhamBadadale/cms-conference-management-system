// controllers/discussionController.js
// Feature 5 — Review Discussion System

const db = require('../config/db');

/**
 * GET /api/discussions/:paper_id
 * Get all discussion messages for a paper.
 * Accessible by: assigned reviewers, admin.
 */
const getDiscussions = async (req, res) => {
  try {
    const { paper_id } = req.params;

    // Reviewers: must be assigned to this paper
    if (req.user.role === 'reviewer') {
      const [assigned] = await db.query(
        'SELECT id FROM ReviewerAssignments WHERE paper_id = ? AND reviewer_id = ?',
        [paper_id, req.user.id]
      );
      if (assigned.length === 0) {
        return res.status(403).json({ message: 'You are not assigned to this paper' });
      }
    }

    const [rows] = await db.query(
      `SELECT rd.discussion_id, rd.paper_id, rd.message, rd.posted_at,
              -- Double-blind: show reviewer name only to other reviewers and admin
              CASE WHEN ? IN ('admin', 'coordinator') 
                   THEN u.name 
                   ELSE CONCAT('Reviewer #', rd.reviewer_id)
              END AS poster_name,
              rd.reviewer_id,
              (rd.reviewer_id = ?) AS is_mine
       FROM Review_Discussions rd
       JOIN Users u ON rd.reviewer_id = u.id
       WHERE rd.paper_id = ?
       ORDER BY rd.posted_at ASC`,
      [req.user.role, req.user.id, paper_id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/discussions/:paper_id
 * Reviewer posts a discussion message on a paper.
 * Only reviewers assigned to that paper can post.
 */
const postDiscussionMessage = async (req, res) => {
  try {
    const { paper_id } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    // Verify assignment
    const [assigned] = await db.query(
      'SELECT id FROM ReviewerAssignments WHERE paper_id = ? AND reviewer_id = ?',
      [paper_id, req.user.id]
    );
    if (assigned.length === 0) {
      return res.status(403).json({ message: 'You are not assigned to this paper' });
    }

    const [result] = await db.query(
      `INSERT INTO Review_Discussions (paper_id, reviewer_id, message)
       VALUES (?, ?, ?)`,
      [paper_id, req.user.id, message.trim()]
    );

    // Notify other co-reviewers on this paper
    const [coReviewers] = await db.query(
      `SELECT reviewer_id FROM ReviewerAssignments 
       WHERE paper_id = ? AND reviewer_id != ?`,
      [paper_id, req.user.id]
    );
    for (const cr of coReviewers) {
      await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [
        cr.reviewer_id,
        `A co-reviewer posted a new discussion message on paper #${paper_id}.`
      ]);
    }

    res.status(201).json({
      message: 'Discussion message posted',
      discussion_id: result.insertId
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * DELETE /api/discussions/message/:discussion_id
 * Admin can delete any message; reviewer can delete their own.
 */
const deleteDiscussionMessage = async (req, res) => {
  try {
    const { discussion_id } = req.params;

    const [rows] = await db.query(
      'SELECT * FROM Review_Discussions WHERE discussion_id = ?', [discussion_id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Message not found' });

    if (req.user.role !== 'admin' && rows[0].reviewer_id !== req.user.id) {
      return res.status(403).json({ message: 'Cannot delete another reviewer\'s message' });
    }

    await db.query('DELETE FROM Review_Discussions WHERE discussion_id = ?', [discussion_id]);
    res.json({ message: 'Discussion message deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getDiscussions, postDiscussionMessage, deleteDiscussionMessage };
