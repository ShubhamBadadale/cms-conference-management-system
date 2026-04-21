const db = require('../config/db');
const {
  deleteCertificateFile,
  generateCertificateFile,
  resolveCertificateFilePath,
} = require('../services/certificateService');

const buildInlineFileName = (paperTitle) => {
  const safeTitle = String(paperTitle || 'certificate')
    .replace(/[^a-z0-9-_]+/gi, '_')
    .replace(/^_+|_+$/g, '');

  return `${safeTitle || 'certificate'}-certificate.pdf`;
};

const sendInlinePdf = (res, filePath, fileName) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

  res.sendFile(filePath, (error) => {
    if (!error) {
      return;
    }

    if (res.headersSent) {
      return;
    }

    const status = error.code === 'ENOENT' ? 404 : 500;
    res.status(status).json({
      message: error.code === 'ENOENT' ? 'Certificate file not found' : 'Server error',
      error: error.message,
    });
  });
};

const generateCertificate = async (req, res) => {
  const connection = await db.getConnection();
  let createdCertificatePath = null;

  try {
    const paperId = Number(req.body?.paper_id);

    if (!Number.isInteger(paperId) || paperId <= 0) {
      return res.status(400).json({ message: 'Valid paper_id is required' });
    }

    await connection.beginTransaction();

    const [papers] = await connection.query(
      `SELECT
         p.id,
         p.title,
         p.author_id,
         u.name AS author_name,
         c.title AS conference_title
       FROM Papers p
       JOIN Users u ON p.author_id = u.id
       JOIN Conferences c ON p.conference_id = c.id
       WHERE p.id = ?
         AND p.status = 'accepted'
         AND p.is_active = TRUE
         AND u.is_active = TRUE
         AND c.is_active = TRUE
       FOR UPDATE`,
      [paperId]
    );

    if (papers.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Accepted paper not found' });
    }

    const paper = papers[0];
    const [existingCertificates] = await connection.query(
      'SELECT id FROM Certificates WHERE paper_id = ? FOR UPDATE',
      [paperId]
    );

    if (existingCertificates.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: 'Certificate already generated' });
    }

    const { certificatePath, issuedAt } = await generateCertificateFile({
      paperId: paper.id,
      authorName: paper.author_name,
      paperTitle: paper.title,
      conferenceTitle: paper.conference_title,
    });
    createdCertificatePath = certificatePath;

    await connection.query(
      `INSERT INTO Certificates (paper_id, user_id, certificate_path, generated_date)
       VALUES (?, ?, ?, ?)`,
      [paper.id, paper.author_id, certificatePath, issuedAt]
    );
    await connection.query(
      'INSERT INTO Notifications (user_id, message) VALUES (?, ?)',
      [paper.author_id, `Your certificate for "${paper.title}" is now available for viewing and download.`]
    );

    await connection.commit();

    res.json({
      message: 'Certificate generated',
      certificate_path: certificatePath,
      generated_date: issuedAt,
    });
  } catch (err) {
    await connection.rollback();

    if (createdCertificatePath) {
      await deleteCertificateFile(createdCertificatePath).catch(() => {});
    }

    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
};

const downloadCertificate = async (req, res) => {
  try {
    const paperId = req.params.paper_id;

    const [rows] = await db.query(
      `SELECT
         cert.certificate_path,
         p.title AS paper_title
       FROM Certificates cert
       JOIN Papers p ON cert.paper_id = p.id
       JOIN Conferences c ON p.conference_id = c.id
       WHERE cert.paper_id = ?
         AND cert.user_id = ?
         AND p.is_active = TRUE
         AND c.is_active = TRUE`,
      [paperId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    return sendInlinePdf(
      res,
      resolveCertificateFilePath(rows[0].certificate_path),
      buildInlineFileName(rows[0].paper_title)
    );
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMyCertificates = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         cert.*,
         p.title AS paper_title,
         c.title AS conference_title
       FROM Certificates cert
       JOIN Papers p ON cert.paper_id = p.id
       JOIN Conferences c ON p.conference_id = c.id
       WHERE cert.user_id = ?
         AND p.is_active = TRUE
         AND c.is_active = TRUE`,
      [req.user.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  downloadCertificate,
  generateCertificate,
  getMyCertificates,
};
