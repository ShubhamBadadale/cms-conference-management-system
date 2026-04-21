const fs = require('fs/promises');
const { PDFDocument } = require('pdf-lib');
const db = require('../config/db');
const { getPaperFilePath, resolvePaperVersion } = require('./paperVersionService');

const buildProceedingsPdf = async (conferenceId) => {
  const [conferences] = await db.query(
    `SELECT id, title, is_active
     FROM Conferences
     WHERE id = ?`,
    [conferenceId]
  );

  if (conferences.length === 0) {
    throw new Error('Conference not found');
  }

  if (!conferences[0].is_active) {
    throw new Error('Conference is inactive');
  }

  const [papers] = await db.query(
    `SELECT p.id, p.title, p.version
     FROM Papers p
     WHERE p.conference_id = ?
       AND p.status = 'accepted'
       AND p.is_active = TRUE
     ORDER BY p.id ASC`,
    [conferenceId]
  );

  if (papers.length === 0) {
    throw new Error('No accepted papers found for this conference');
  }

  const mergedPdf = await PDFDocument.create();
  const includedPapers = [];

  for (const paper of papers) {
    const version = await resolvePaperVersion(db, paper.id, null);

    if (!version) {
      continue;
    }

    const sourceBytes = await fs.readFile(getPaperFilePath(version.file_path));
    const sourcePdf = await PDFDocument.load(sourceBytes);
    const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());

    copiedPages.forEach((page) => mergedPdf.addPage(page));
    includedPapers.push({
      id: paper.id,
      title: paper.title,
      version_number: version.version_number,
    });
  }

  if (includedPapers.length === 0) {
    throw new Error('No accepted paper files could be merged');
  }

  mergedPdf.setTitle(`${conferences[0].title} Proceedings`);
  mergedPdf.setSubject(`Merged proceedings for ${conferences[0].title}`);

  return {
    buffer: Buffer.from(await mergedPdf.save()),
    conferenceTitle: conferences[0].title,
    papers: includedPapers,
  };
};

module.exports = { buildProceedingsPdf };
