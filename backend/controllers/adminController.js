const db = require('../config/db');

const getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, role, institution, created_at FROM Users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getReviewers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.institution,
       COUNT(ra.id) as assigned_count
       FROM Users u LEFT JOIN ReviewerAssignments ra ON u.id = ra.reviewer_id
       WHERE u.role = 'reviewer' GROUP BY u.id`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const assignReviewer = async (req, res) => {
  try {
    const { paper_id, reviewer_id } = req.body;
    // Verify reviewer role
    const [reviewer] = await db.query("SELECT id FROM Users WHERE id = ? AND role = 'reviewer'", [reviewer_id]);
    if (reviewer.length === 0) return res.status(400).json({ message: 'Invalid reviewer' });
    // Check not already assigned
    const [existing] = await db.query(
      'SELECT id FROM ReviewerAssignments WHERE paper_id = ? AND reviewer_id = ?', [paper_id, reviewer_id]
    );
    if (existing.length > 0) return res.status(409).json({ message: 'Reviewer already assigned' });
    await db.query('INSERT INTO ReviewerAssignments (paper_id, reviewer_id) VALUES (?, ?)', [paper_id, reviewer_id]);
    await db.query("UPDATE Papers SET status = 'under_review' WHERE id = ? AND status = 'submitted'", [paper_id]);
    // Notify reviewer
    const [paper] = await db.query('SELECT * FROM Papers WHERE id = ?', [paper_id]);
    await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)',
      [reviewer_id, `You have been assigned to review: "${paper[0].title}"`]);
    res.json({ message: 'Reviewer assigned successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const makeDecision = async (req, res) => {
  try {
    const { paper_id, status } = req.body;
    const validStatuses = ['accepted', 'rejected', 'revision'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    await db.query('UPDATE Papers SET status = ? WHERE id = ?', [status, paper_id]);
    const [paper] = await db.query('SELECT * FROM Papers WHERE id = ?', [paper_id]);
    const messages = {
      accepted: `Congratulations! Your paper "${paper[0].title}" has been ACCEPTED.`,
      rejected: `We regret to inform you that your paper "${paper[0].title}" has been REJECTED.`,
      revision: `Your paper "${paper[0].title}" requires REVISION. Please check reviewer comments.`
    };
    await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)',
      [paper[0].author_id, messages[status]]);
    res.json({ message: `Paper status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getAcceptedPapers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.name as author_name, u.institution, c.title as conference_title,
       AVG(r.total_score) as avg_score
       FROM Papers p JOIN Users u ON p.author_id = u.id 
       JOIN Conferences c ON p.conference_id = c.id
       LEFT JOIN Reviews r ON p.id = r.paper_id
       WHERE p.status = 'accepted' GROUP BY p.id ORDER BY avg_score DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const sendNotification = async (req, res) => {
  try {
    const { user_id, message } = req.body;
    if (user_id === 'all') {
      const [users] = await db.query('SELECT id FROM Users');
      for (const user of users) {
        await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [user.id, message]);
      }
    } else {
      await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [user_id, message]);
    }
    res.json({ message: 'Notification sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const generateCertificate = async (req, res) => {
  try {
    const { paper_id } = req.body;
    const [papers] = await db.query(
      `SELECT p.*, u.name as author_name, u.email, c.title as conf_title 
       FROM Papers p JOIN Users u ON p.author_id = u.id 
       JOIN Conferences c ON p.conference_id = c.id 
       WHERE p.id = ? AND p.status = 'accepted'`,
      [paper_id]
    );
    if (papers.length === 0) return res.status(404).json({ message: 'Accepted paper not found' });
    const paper = papers[0];
    // Check if cert already generated
    const [existing] = await db.query('SELECT id FROM Certificates WHERE paper_id = ?', [paper_id]);
    if (existing.length > 0) return res.status(409).json({ message: 'Certificate already generated' });
    const certPath = `cert-${paper_id}-${Date.now()}.pdf`;
    // Generate PDF certificate using pdfkit
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
    const certDir = path.join(__dirname, '../uploads/certificates');
    if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
    const stream = fs.createWriteStream(path.join(certDir, certPath));
    doc.pipe(stream);
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f0f4ff');
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#1a3a8f');
    doc.fillColor('#1a3a8f').fontSize(36).font('Helvetica-Bold')
       .text('CERTIFICATE OF ACCEPTANCE', 0, 80, { align: 'center' });
    doc.fillColor('#444').fontSize(16).font('Helvetica')
       .text('This is to certify that', 0, 150, { align: 'center' });
    doc.fillColor('#1a3a8f').fontSize(28).font('Helvetica-Bold')
       .text(paper.author_name, 0, 180, { align: 'center' });
    doc.fillColor('#444').fontSize(16).font('Helvetica')
       .text('has had their paper accepted at', 0, 230, { align: 'center' });
    doc.fillColor('#1a3a8f').fontSize(20).font('Helvetica-Bold')
       .text(paper.conf_title, 0, 260, { align: 'center' });
    doc.fillColor('#333').fontSize(14).font('Helvetica-Oblique')
       .text(`Paper Title: "${paper.title}"`, 80, 310, { align: 'center' });
    doc.fillColor('#888').fontSize(12).font('Helvetica')
       .text(`Generated: ${new Date().toLocaleDateString()}`, 0, 380, { align: 'center' });
    doc.end();
    await new Promise((resolve) => stream.on('finish', resolve));
    await db.query(
      'INSERT INTO Certificates (paper_id, user_id, certificate_path) VALUES (?, ?, ?)',
      [paper_id, paper.author_id, certPath]
    );
    await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)',
      [paper.author_id, `Your certificate for "${paper.title}" is now available for download.`]);
    res.json({ message: 'Certificate generated', certPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [[{ total_papers }]] = await db.query('SELECT COUNT(*) as total_papers FROM Papers');
    const [[{ total_users }]] = await db.query('SELECT COUNT(*) as total_users FROM Users');
    const [[{ total_conferences }]] = await db.query('SELECT COUNT(*) as total_conferences FROM Conferences');
    const [[{ accepted }]] = await db.query("SELECT COUNT(*) as accepted FROM Papers WHERE status = 'accepted'");
    const [[{ rejected }]] = await db.query("SELECT COUNT(*) as rejected FROM Papers WHERE status = 'rejected'");
    const [[{ under_review }]] = await db.query("SELECT COUNT(*) as under_review FROM Papers WHERE status = 'under_review'");
    res.json({ total_papers, total_users, total_conferences, accepted, rejected, under_review });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getAllUsers, getReviewers, assignReviewer, makeDecision, getAcceptedPapers, sendNotification, generateCertificate, getDashboardStats };
