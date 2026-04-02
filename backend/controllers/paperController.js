const db = require('../config/db');
const path = require('path');

const submitPaper = async (req, res) => {
  try {
    const { title, abstract, keywords, conference_id } = req.body;
    if (!req.file) return res.status(400).json({ message: 'PDF file required' });
    if (!title || !conference_id) return res.status(400).json({ message: 'Title and conference are required' });
    const file_path = req.file.filename;
    const [result] = await db.query(
      'INSERT INTO Papers (title, abstract, keywords, file_path, author_id, conference_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title, abstract, keywords, file_path, req.user.id, conference_id]
    );
    // Notify admin
    const [admins] = await db.query("SELECT id FROM Users WHERE role = 'admin'");
    for (const admin of admins) {
      await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)',
        [admin.id, `New paper submitted: "${title}" by ${req.user.name}`]);
    }
    res.status(201).json({ message: 'Paper submitted successfully', paperId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMySubmissions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, c.title as conference_title FROM Papers p 
       JOIN Conferences c ON p.conference_id = c.id 
       WHERE p.author_id = ? ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPaperById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.name as author_name, c.title as conference_title 
       FROM Papers p JOIN Users u ON p.author_id = u.id 
       JOIN Conferences c ON p.conference_id = c.id WHERE p.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Paper not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const resubmitPaper = async (req, res) => {
  try {
    const { paper_id } = req.body;
    if (!req.file) return res.status(400).json({ message: 'PDF file required' });
    const [papers] = await db.query('SELECT * FROM Papers WHERE id = ? AND author_id = ?', [paper_id, req.user.id]);
    if (papers.length === 0) return res.status(404).json({ message: 'Paper not found or unauthorized' });
    const paper = papers[0];
    if (!['revision', 'submitted'].includes(paper.status)) {
      return res.status(400).json({ message: 'Paper is not eligible for resubmission' });
    }
    await db.query(
      'UPDATE Papers SET file_path = ?, status = ?, version = ? WHERE id = ?',
      [req.file.filename, 'submitted', paper.version + 1, paper_id]
    );
    res.json({ message: 'Paper resubmitted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getAllSubmissions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.name as author_name, u.institution, c.title as conference_title 
       FROM Papers p JOIN Users u ON p.author_id = u.id 
       JOIN Conferences c ON p.conference_id = c.id ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const downloadPaper = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Papers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Paper not found' });
    const paper = rows[0];
    // Check permissions: author, admin, or assigned reviewer
    if (req.user.role === 'reviewer') {
      const [assigned] = await db.query(
        'SELECT id FROM ReviewerAssignments WHERE paper_id = ? AND reviewer_id = ?',
        [paper.id, req.user.id]
      );
      if (assigned.length === 0) return res.status(403).json({ message: 'Not assigned to this paper' });
    } else if (req.user.role === 'author' && paper.author_id !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const filePath = path.join(__dirname, '../uploads/papers', paper.file_path);
    res.download(filePath, paper.title + '.pdf');
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPaperReviews = async (req, res) => {
  try {
    const { paper_id } = req.params;
    const [papers] = await db.query('SELECT * FROM Papers WHERE id = ? AND author_id = ?', [paper_id, req.user.id]);
    if (papers.length === 0) return res.status(403).json({ message: 'Unauthorized' });
    const [reviews] = await db.query(
      `SELECT r.*, u.name as reviewer_name FROM Reviews r 
       JOIN Users u ON r.reviewer_id = u.id WHERE r.paper_id = ?`,
      [paper_id]
    );
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { submitPaper, getMySubmissions, getPaperById, resubmitPaper, getAllSubmissions, downloadPaper, getPaperReviews };
