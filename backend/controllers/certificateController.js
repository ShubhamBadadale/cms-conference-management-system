const db = require('../config/db');
const path = require('path');

const downloadCertificate = async (req, res) => {
  try {
    const [certs] = await db.query(
      'SELECT * FROM Certificates WHERE user_id = ? AND paper_id = ?',
      [req.user.id, req.params.paper_id]
    );
    if (certs.length === 0) return res.status(404).json({ message: 'Certificate not found' });
    const cert = certs[0];
    const filePath = path.join(__dirname, '../uploads/certificates', cert.certificate_path);
    res.download(filePath, 'certificate.pdf');
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyCertificates = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT cert.*, p.title as paper_title, c.title as conference_title 
       FROM Certificates cert JOIN Papers p ON cert.paper_id = p.id 
       JOIN Conferences c ON p.conference_id = c.id 
       WHERE cert.user_id = ?`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { downloadCertificate, getMyCertificates };
