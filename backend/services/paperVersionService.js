const path = require('path');

const papersUploadDir = path.join(__dirname, '../uploads/papers');

const normalizeKeywords = (value) => {
  const source = Array.isArray(value) ? value.join(',') : String(value || '');
  const uniqueKeywords = new Set();

  source
    .split(',')
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)
    .forEach((keyword) => uniqueKeywords.add(keyword));

  return Array.from(uniqueKeywords);
};

const syncPaperKeywords = async (connection, paperId, keywords) => {
  const normalizedKeywords = normalizeKeywords(keywords);

  await connection.query('DELETE FROM PaperKeywords WHERE paper_id = ?', [paperId]);

  if (normalizedKeywords.length === 0) {
    return normalizedKeywords;
  }

  const values = normalizedKeywords.map((keyword) => [paperId, keyword]);
  await connection.query(
    'INSERT INTO PaperKeywords (paper_id, keyword) VALUES ?',
    [values]
  );

  return normalizedKeywords;
};

const insertPaperVersion = async (connection, { paperId, versionNumber, file, plagiarismResult }) => {
  await connection.query(
    `INSERT INTO PaperVersions (
      paper_id,
      version_number,
      file_path,
      original_filename,
      mime_type,
      file_size,
      plagiarism_score,
      plagiarism_flagged,
      plagiarism_notes,
      is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [
      paperId,
      versionNumber,
      file.filename,
      file.originalname || file.filename,
      file.mimetype || 'application/pdf',
      file.size || null,
      plagiarismResult?.score ?? null,
      Boolean(plagiarismResult?.flagged),
      plagiarismResult?.reason || null,
    ]
  );
};

const createPaperWithVersion = async (
  connection,
  { title, abstract, keywords, conferenceId, authorId, file, plagiarismResult }
) => {
  const status = plagiarismResult?.flagged ? 'flagged_for_review' : 'submitted';
  const normalizedKeywordList = normalizeKeywords(keywords).join(', ');

  const [result] = await connection.query(
    `INSERT INTO Papers (
      title,
      abstract,
      keywords,
      file_path,
      author_id,
      conference_id,
      status,
      version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      title,
      abstract || null,
      normalizedKeywordList,
      file.filename,
      authorId,
      conferenceId,
      status,
    ]
  );

  await syncPaperKeywords(connection, result.insertId, keywords);
  await insertPaperVersion(connection, {
    paperId: result.insertId,
    versionNumber: 1,
    file,
    plagiarismResult,
  });

  return {
    paperId: result.insertId,
    status,
    version: 1,
    keywords: normalizeKeywords(keywords),
  };
};

const addPaperVersion = async (
  connection,
  { paperId, file, plagiarismResult, keywords, title, abstract }
) => {
  const [papers] = await connection.query(
    `SELECT *
     FROM Papers
     WHERE id = ?
     FOR UPDATE`,
    [paperId]
  );

  if (papers.length === 0) {
    throw new Error('Paper not found');
  }

  const paper = papers[0];
  const nextVersion = Number(paper.version || 0) + 1;
  const status = plagiarismResult?.flagged ? 'flagged_for_review' : 'submitted';
  const normalizedKeywords = keywords === undefined ? paper.keywords : normalizeKeywords(keywords).join(', ');
  const nextTitle = title === undefined ? paper.title : title;
  const nextAbstract = abstract === undefined ? paper.abstract : abstract;

  await connection.query(
    `UPDATE Papers
     SET title = ?, abstract = ?, keywords = ?, file_path = ?, status = ?, version = ?
     WHERE id = ?`,
    [
      nextTitle,
      nextAbstract,
      normalizedKeywords,
      file.filename,
      status,
      nextVersion,
      paperId,
    ]
  );

  if (keywords !== undefined) {
    await syncPaperKeywords(connection, paperId, keywords);
  }

  await insertPaperVersion(connection, {
    paperId,
    versionNumber: nextVersion,
    file,
    plagiarismResult,
  });

  return {
    paper: { ...paper, title: nextTitle, abstract: nextAbstract, keywords: normalizedKeywords },
    status,
    version: nextVersion,
  };
};

const getPaperVersions = async (dbOrConnection, paperId) => {
  const [rows] = await dbOrConnection.query(
    `SELECT
      pv.id,
      pv.paper_id,
      pv.version_number,
      pv.file_path,
      pv.original_filename,
      pv.mime_type,
      pv.file_size,
      pv.plagiarism_score,
      pv.plagiarism_flagged,
      pv.plagiarism_notes,
      pv.is_active,
      pv.uploaded_at,
      CASE WHEN pv.version_number = p.version THEN TRUE ELSE FALSE END AS is_current
     FROM PaperVersions pv
     JOIN Papers p ON p.id = pv.paper_id
     WHERE pv.paper_id = ?
     ORDER BY pv.version_number DESC`,
    [paperId]
  );

  return rows;
};

const resolvePaperVersion = async (dbOrConnection, paperId, requestedVersion) => {
  const [rows] = await dbOrConnection.query(
    `SELECT *
     FROM PaperVersions
     WHERE paper_id = ?
       AND is_active = TRUE
       AND (? IS NULL OR version_number = ?)
     ORDER BY version_number DESC
     LIMIT 1`,
    [paperId, requestedVersion, requestedVersion]
  );

  return rows[0] || null;
};

const getPaperFilePath = (fileName) => path.join(papersUploadDir, fileName);

module.exports = {
  addPaperVersion,
  createPaperWithVersion,
  getPaperFilePath,
  getPaperVersions,
  normalizeKeywords,
  resolvePaperVersion,
  syncPaperKeywords,
};
