const db = require('../config/db');
const {
  addPaperVersion,
  createPaperWithVersion,
  getPaperFilePath,
  getPaperVersions,
  resolvePaperVersion,
} = require('../services/paperVersionService');

const buildPlagiarismSummary = (plagiarismCheck) => ({
  score: plagiarismCheck?.score ?? null,
  threshold: plagiarismCheck?.threshold ?? null,
  flagged: Boolean(plagiarismCheck?.flagged),
  reason: plagiarismCheck?.reason || null,
});

const buildInlinePdfName = (title, versionNumber) => {
  const safeTitle = String(title || 'paper')
    .replace(/[^a-z0-9-_]+/gi, '_')
    .replace(/^_+|_+$/g, '');

  return `${safeTitle || 'paper'}-v${versionNumber}.pdf`;
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
      message: error.code === 'ENOENT' ? 'Paper file not found' : 'Server error',
      error: error.message,
    });
  });
};

const getPaperRecord = async (paperId) => {
  const [rows] = await db.query(
    `SELECT
      p.*,
      u.name AS author_name,
      u.email AS author_email,
      u.is_active AS author_is_active,
      c.title AS conference_title,
      c.status AS conference_status,
      c.is_active AS conference_is_active
     FROM Papers p
     JOIN Users u ON p.author_id = u.id
     JOIN Conferences c ON p.conference_id = c.id
     WHERE p.id = ?`,
    [paperId]
  );

  return rows[0] || null;
};

const canAccessPaper = async (paper, user) => {
  if (!paper) return false;
  if (user.role === 'admin' || user.role === 'coordinator') return true;
  if (!paper.is_active || !paper.conference_is_active) return false;
  if (user.role === 'author') return paper.author_id === user.id;

  if (user.role === 'reviewer') {
    const [assigned] = await db.query(
      'SELECT id FROM ReviewerAssignments WHERE paper_id = ? AND reviewer_id = ?',
      [paper.id, user.id]
    );
    return assigned.length > 0;
  }

  return false;
};

const submitPaper = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { title, abstract, keywords, conference_id } = req.body;

    if (!req.file) return res.status(400).json({ message: 'PDF file required' });
    if (!title || !conference_id) {
      return res.status(400).json({ message: 'Title and conference are required' });
    }

    await connection.beginTransaction();

    const [conferences] = await connection.query(
      `SELECT id, title
       FROM Conferences
       WHERE id = ? AND status = 'published' AND is_active = TRUE`,
      [conference_id]
    );

    if (conferences.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Active published conference not found' });
    }

    const result = await createPaperWithVersion(connection, {
      title,
      abstract,
      keywords,
      conferenceId: conference_id,
      authorId: req.user.id,
      file: req.file,
      plagiarismResult: req.plagiarismCheck,
    });

    const [admins] = await connection.query(
      "SELECT id FROM Users WHERE role = 'admin' AND is_active = TRUE"
    );

    for (const admin of admins) {
      await connection.query(
        'INSERT INTO Notifications (user_id, message) VALUES (?, ?)',
        [
          admin.id,
          `New paper submitted: "${title}" by ${req.user.name}${result.status === 'flagged_for_review' ? ' (flagged for review)' : ''}`,
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: result.status === 'flagged_for_review'
        ? 'Paper submitted and flagged for manual review'
        : 'Paper submitted successfully',
      paperId: result.paperId,
      status: result.status,
      version: result.version,
      plagiarism: buildPlagiarismSummary(req.plagiarismCheck),
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
};

const getMySubmissions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        p.*,
        c.title AS conference_title,
        c.status AS conference_status,
        (SELECT COUNT(*) FROM PaperVersions pv WHERE pv.paper_id = p.id) AS version_count
       FROM Papers p
       JOIN Conferences c ON p.conference_id = c.id
       WHERE p.author_id = ?
         AND p.is_active = TRUE
         AND c.is_active = TRUE
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPaperById = async (req, res) => {
  try {
    const paper = await getPaperRecord(req.params.id);

    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    if (!(await canAccessPaper(paper, req.user))) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(paper);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const resubmitPaper = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { paper_id } = req.body;

    if (!req.file) return res.status(400).json({ message: 'PDF file required' });

    await connection.beginTransaction();

    const [papers] = await connection.query(
      `SELECT *
       FROM Papers
       WHERE id = ? AND author_id = ? AND is_active = TRUE
       FOR UPDATE`,
      [paper_id, req.user.id]
    );

    if (papers.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Paper not found or unauthorized' });
    }

    const paper = papers[0];
    if (paper.status !== 'revision') {
      await connection.rollback();
      return res.status(400).json({ message: 'Only papers marked for revision can be resubmitted' });
    }

    const result = await addPaperVersion(connection, {
      paperId: paper.id,
      file: req.file,
      plagiarismResult: req.plagiarismCheck,
    });

    const [admins] = await connection.query(
      "SELECT id FROM Users WHERE role = 'admin' AND is_active = TRUE"
    );

    for (const admin of admins) {
      await connection.query(
        'INSERT INTO Notifications (user_id, message) VALUES (?, ?)',
        [admin.id, `Revision uploaded for "${paper.title}" by ${req.user.name}.`]
      );
    }

    await connection.commit();

    res.json({
      message: result.status === 'flagged_for_review'
        ? 'Paper resubmitted and flagged for manual review'
        : 'Paper resubmitted successfully',
      status: result.status,
      version: result.version,
      plagiarism: buildPlagiarismSummary(req.plagiarismCheck),
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
};

const getAllSubmissions = async (req, res) => {
  try {
    const conditions = [];
    if (req.user.role !== 'admin') {
      conditions.push('p.is_active = TRUE', 'c.is_active = TRUE', 'u.is_active = TRUE');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await db.query(
      `SELECT
        p.*,
        p.is_active,
        u.name AS author_name,
        u.institution,
        u.is_active AS author_is_active,
        c.title AS conference_title,
        c.is_active AS conference_is_active,
        (SELECT COUNT(*) FROM PaperVersions pv WHERE pv.paper_id = p.id) AS version_count,
        CASE WHEN COALESCE(cert.certificate_count, 0) > 0 THEN TRUE ELSE FALSE END AS has_certificate,
        cert.certificate_generated_date
       FROM Papers p
       JOIN Users u ON p.author_id = u.id
       JOIN Conferences c ON p.conference_id = c.id
       LEFT JOIN (
         SELECT
           paper_id,
           COUNT(*) AS certificate_count,
           MAX(generated_date) AS certificate_generated_date
         FROM Certificates
         GROUP BY paper_id
       ) cert ON cert.paper_id = p.id
       ${whereClause}
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const downloadPaper = async (req, res) => {
  try {
    const paper = await getPaperRecord(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });

    if (!(await canAccessPaper(paper, req.user))) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const requestedVersion = req.query.version ? Number(req.query.version) : null;
    if (req.query.version && !Number.isInteger(requestedVersion)) {
      return res.status(400).json({ message: 'Version must be a valid integer' });
    }

    const version = await resolvePaperVersion(db, paper.id, requestedVersion);
    if (!version) {
      return res.status(404).json({ message: 'Paper version not found' });
    }

    return sendInlinePdf(
      res,
      getPaperFilePath(version.file_path),
      buildInlinePdfName(paper.title, version.version_number)
    );
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPaperReviews = async (req, res) => {
  try {
    const { paper_id } = req.params;
    const paper = await getPaperRecord(paper_id);

    if (!paper || paper.author_id !== req.user.id || !paper.is_active) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const [reviews] = await db.query(
      `SELECT r.*, u.name AS reviewer_name
       FROM Reviews r
       JOIN Users u ON r.reviewer_id = u.id
       WHERE r.paper_id = ?
       ORDER BY r.review_date DESC`,
      [paper_id]
    );
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPaperVersionHistory = async (req, res) => {
  try {
    const paper = await getPaperRecord(req.params.id);
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    if (!(await canAccessPaper(paper, req.user))) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const versions = await getPaperVersions(db, paper.id);
    res.json(
      versions.map((version) => ({
        ...version,
        download_path: `/api/papers/${paper.id}/download?version=${version.version_number}`,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  downloadPaper,
  getAllSubmissions,
  getMySubmissions,
  getPaperById,
  getPaperReviews,
  getPaperVersionHistory,
  resubmitPaper,
  submitPaper,
};
