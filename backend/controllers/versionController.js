// controllers/versionController.js
// Feature 4 — Paper Versioning System

const db = require('../config/db');
const path = require('path');

/**
 * POST /api/versions/upload
 * Author uploads a new version of their paper.
 * Requires: multipart/form-data with 'paper' file and body { paper_id }
 */
const uploadNewVersion = async (req, res) => {
  try {
    const { paper_id } = req.body;
    if (!req.file) return res.status(400).json({ message: 'PDF file required' });
    if (!paper_id) return res.status(400).json({ message: 'paper_id is required' });

    // Verify paper belongs to this author
    const [papers] = await db.query(
      'SELECT * FROM Papers WHERE id = ? AND author_id = ?',
      [paper_id, req.user.id]
    );
    if (papers.length === 0) {
      return res.status(404).json({ message: 'Paper not found or unauthorized' });
    }

    const paper = papers[0];

    // Only allow versioning when status is revision or submitted
    if (!['revision', 'submitted', 'under_review'].includes(paper.status)) {
      return res.status(400).json({ message: `Cannot upload a new version when paper is "${paper.status}"` });
    }

    const newVersion = paper.version + 1;
    const filePath = req.file.filename;

    // Insert into Paper_Versions archive table
    await db.query(
      `INSERT INTO Paper_Versions (paper_id, version_number, file_path, uploaded_by)
       VALUES (?, ?, ?, ?)`,
      [paper_id, newVersion, filePath, req.user.id]
    );

    // Update the master Papers record
    await db.query(
      `UPDATE Papers SET file_path = ?, version = ?, status = 'submitted' WHERE id = ?`,
      [filePath, newVersion, paper_id]
    );

    // Notify admins
    const [admins] = await db.query("SELECT id FROM Users WHERE role = 'admin'");
    for (const admin of admins) {
      await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [
        admin.id,
        `Paper "${paper.title}" has been updated to version ${newVersion} by the author.`
      ]);
    }

    res.status(201).json({ message: `Version ${newVersion} uploaded successfully`, version: newVersion });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/versions/:paper_id
 * Get full version history for a paper.
 * Accessible by paper's author, admin, or assigned reviewer.
 */
const getVersionHistory = async (req, res) => {
  try {
    const { paper_id } = req.params;

    // Permission check
    if (req.user.role === 'author') {
      const [own] = await db.query(
        'SELECT id FROM Papers WHERE id = ? AND author_id = ?', [paper_id, req.user.id]
      );
      if (own.length === 0) return res.status(403).json({ message: 'Unauthorized' });
    } else if (req.user.role === 'reviewer') {
      const [assigned] = await db.query(
        'SELECT id FROM ReviewerAssignments WHERE paper_id = ? AND reviewer_id = ?',
        [paper_id, req.user.id]
      );
      if (assigned.length === 0) return res.status(403).json({ message: 'Unauthorized' });
    }

    const [rows] = await db.query(
      `SELECT pv.*, u.name AS uploaded_by_name
       FROM Paper_Versions pv
       LEFT JOIN Users u ON pv.uploaded_by = u.id
       WHERE pv.paper_id = ?
       ORDER BY pv.version_number DESC`,
      [paper_id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/versions/:paper_id/download/:version_number
 * Download a specific version of a paper.
 */
const downloadVersion = async (req, res) => {
  try {
    const { paper_id, version_number } = req.params;

    const [rows] = await db.query(
      'SELECT * FROM Paper_Versions WHERE paper_id = ? AND version_number = ?',
      [paper_id, version_number]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Version not found' });

    const filePath = path.join(__dirname, '../uploads/papers', rows[0].file_path);
    res.download(filePath, `paper-${paper_id}-v${version_number}.pdf`);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { uploadNewVersion, getVersionHistory, downloadVersion };
