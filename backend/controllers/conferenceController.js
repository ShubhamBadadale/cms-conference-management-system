const db = require('../config/db');

const getAllConferences = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.name AS creator_name
       FROM Conferences c
       LEFT JOIN Users u ON c.created_by = u.id
       WHERE c.status = 'published' AND c.is_active = TRUE
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getAllConferencesAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.name AS creator_name
       FROM Conferences c
       LEFT JOIN Users u ON c.created_by = u.id
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getConferenceById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.name AS creator_name
       FROM Conferences c
       LEFT JOIN Users u ON c.created_by = u.id
       WHERE c.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Conference not found' });
    }

    if (!rows[0].is_active && req.user.role !== 'admin') {
      return res.status(404).json({ message: 'Conference not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createConference = async (req, res) => {
  try {
    const { title, description, topics, venue, submission_deadline } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const [result] = await db.query(
      `INSERT INTO Conferences (
        title,
        description,
        topics,
        venue,
        submission_deadline,
        created_by,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [title, description || null, topics || null, venue || null, submission_deadline || null, req.user.id]
    );

    res.status(201).json({ message: 'Conference created', conferenceId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const publishConference = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE Conferences SET status = 'published' WHERE id = ? AND is_active = TRUE", [id]);
    res.json({ message: 'Conference published' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateConference = async (req, res) => {
  try {
    const { title, description, topics, venue, submission_deadline, status } = req.body;
    await db.query(
      `UPDATE Conferences
       SET title = ?, description = ?, topics = ?, venue = ?, submission_deadline = ?, status = ?
       WHERE id = ?`,
      [title, description, topics, venue, submission_deadline, status, req.params.id]
    );
    res.json({ message: 'Conference updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  createConference,
  getAllConferences,
  getAllConferencesAdmin,
  getConferenceById,
  publishConference,
  updateConference,
};
