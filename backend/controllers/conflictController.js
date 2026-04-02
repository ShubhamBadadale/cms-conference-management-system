// controllers/conflictController.js
// Feature 1 — Conflict of Interest (COI) System

const db = require('../config/db');

/**
 * POST /api/conflicts/declare
 * Reviewer declares a COI on a paper they are assigned (or about to be assigned).
 */
const declareConflict = async (req, res) => {
  try {
    const { paper_id, reason } = req.body;
    const reviewer_id = req.user.id;

    if (!paper_id) return res.status(400).json({ message: 'paper_id is required' });

    // Confirm paper exists
    const [papers] = await db.query('SELECT id, title FROM Papers WHERE id = ?', [paper_id]);
    if (papers.length === 0) return res.status(404).json({ message: 'Paper not found' });

    // Upsert conflict
    await db.query(
      `INSERT INTO Conflicts (paper_id, reviewer_id, reason, declared_by)
       VALUES (?, ?, ?, 'reviewer')
       ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
      [paper_id, reviewer_id, reason || '']
    );

    // If the reviewer was already assigned, remove that assignment
    await db.query(
      'DELETE FROM ReviewerAssignments WHERE paper_id = ? AND reviewer_id = ?',
      [paper_id, reviewer_id]
    );

    // Notify admins
    const [admins] = await db.query("SELECT id FROM Users WHERE role = 'admin'");
    for (const admin of admins) {
      await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [
        admin.id,
        `Reviewer ${req.user.name} declared a conflict of interest on paper #${paper_id}: "${papers[0].title}"`
      ]);
    }

    res.status(201).json({ message: 'Conflict of interest declared successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/conflicts/admin-flag
 * Admin manually flags a COI between a reviewer and a paper.
 */
const adminFlagConflict = async (req, res) => {
  try {
    const { paper_id, reviewer_id, reason } = req.body;
    if (!paper_id || !reviewer_id) {
      return res.status(400).json({ message: 'paper_id and reviewer_id are required' });
    }

    await db.query(
      `INSERT INTO Conflicts (paper_id, reviewer_id, reason, declared_by)
       VALUES (?, ?, ?, 'admin')
       ON DUPLICATE KEY UPDATE reason = VALUES(reason), declared_by = 'admin'`,
      [paper_id, reviewer_id, reason || 'Flagged by admin']
    );

    // Remove any existing assignment
    await db.query(
      'DELETE FROM ReviewerAssignments WHERE paper_id = ? AND reviewer_id = ?',
      [paper_id, reviewer_id]
    );

    res.json({ message: 'Conflict flagged and assignment removed if it existed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/conflicts/paper/:paper_id
 * Admin: get all conflicts for a given paper.
 */
const getConflictsForPaper = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.name AS reviewer_name, u.email AS reviewer_email
       FROM Conflicts c
       JOIN Users u ON c.reviewer_id = u.id
       WHERE c.paper_id = ?
       ORDER BY c.created_at DESC`,
      [req.params.paper_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/conflicts/mine
 * Reviewer: view their own declared conflicts.
 */
const getMyConflicts = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, p.title AS paper_title
       FROM Conflicts c
       JOIN Papers p ON c.paper_id = p.id
       WHERE c.reviewer_id = ?
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { declareConflict, adminFlagConflict, getConflictsForPaper, getMyConflicts };
