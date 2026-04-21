const fs = require('fs/promises');
const path = require('path');
const { PDFDocument, PageSizes, StandardFonts, rgb } = require('pdf-lib');

const certificatesDir = path.join(__dirname, '../uploads/certificates');

const sanitizeFileName = (value, fallback = 'document') => {
  const sanitized = String(value || fallback)
    .replace(/[^a-z0-9-_]+/gi, '_')
    .replace(/^_+|_+$/g, '');

  return sanitized || fallback;
};

const ensureCertificatesDirectory = async () => {
  await fs.mkdir(certificatesDir, { recursive: true });
};

const resolveCertificateFilePath = (fileName) => {
  const absoluteCertificatesDir = path.resolve(certificatesDir);
  const resolvedPath = path.resolve(absoluteCertificatesDir, fileName);

  if (
    resolvedPath !== absoluteCertificatesDir &&
    !resolvedPath.startsWith(`${absoluteCertificatesDir}${path.sep}`)
  ) {
    throw new Error('Invalid certificate file path');
  }

  return resolvedPath;
};

const buildCertificateFileName = (paperId, paperTitle) => (
  `certificate-${paperId}-${sanitizeFileName(paperTitle, 'paper')}.pdf`
);

const formatIssueDate = (value) => new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(value);

const drawCenteredText = (page, text, options) => {
  const width = options.font.widthOfTextAtSize(text, options.size);
  const x = (page.getWidth() - width) / 2;

  page.drawText(text, {
    x,
    y: options.y,
    size: options.size,
    font: options.font,
    color: options.color,
    opacity: options.opacity,
  });
};

const splitTextToLines = (text, font, size, maxWidth) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (!currentLine || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : ['Untitled Paper'];
};

const buildCertificatePdf = async ({ authorName, paperTitle, conferenceTitle, issuedAt }) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PageSizes.A4[1], PageSizes.A4[0]]);
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const [serifBold, serifRegular, sansRegular, sansBold] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    pdfDoc.embedFont(StandardFonts.TimesRoman),
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
  ]);

  const palette = {
    ink: rgb(0.11, 0.2, 0.34),
    accent: rgb(0.88, 0.48, 0.22),
    border: rgb(0.72, 0.78, 0.87),
    paper: rgb(0.98, 0.98, 0.97),
    soft: rgb(0.38, 0.43, 0.51),
  };

  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: palette.paper,
  });

  page.drawRectangle({
    x: 24,
    y: 24,
    width: pageWidth - 48,
    height: pageHeight - 48,
    borderWidth: 3,
    borderColor: palette.ink,
  });

  page.drawRectangle({
    x: 38,
    y: 38,
    width: pageWidth - 76,
    height: pageHeight - 76,
    borderWidth: 1,
    borderColor: palette.border,
  });

  page.drawRectangle({
    x: 70,
    y: pageHeight - 110,
    width: pageWidth - 140,
    height: 2,
    color: palette.accent,
    opacity: 0.9,
  });

  drawCenteredText(page, 'ConferMS', {
    color: palette.soft,
    font: sansBold,
    size: 15,
    y: pageHeight - 84,
  });

  drawCenteredText(page, 'CERTIFICATE OF ACCEPTANCE', {
    color: palette.ink,
    font: serifBold,
    size: 28,
    y: pageHeight - 145,
  });

  drawCenteredText(page, 'This certifies that', {
    color: palette.soft,
    font: sansRegular,
    size: 16,
    y: pageHeight - 194,
  });

  drawCenteredText(page, authorName, {
    color: palette.ink,
    font: serifBold,
    size: 30,
    y: pageHeight - 245,
  });

  drawCenteredText(page, 'has an accepted paper in', {
    color: palette.soft,
    font: sansRegular,
    size: 16,
    y: pageHeight - 288,
  });

  drawCenteredText(page, conferenceTitle, {
    color: palette.accent,
    font: sansBold,
    size: 24,
    y: pageHeight - 334,
  });

  drawCenteredText(page, 'Paper Title', {
    color: palette.soft,
    font: sansBold,
    size: 12,
    y: pageHeight - 390,
  });

  const titleFontSize = String(paperTitle || '').length > 70 ? 15 : 18;
  const titleLines = splitTextToLines(
    `"${String(paperTitle || 'Untitled Paper')}"`,
    serifRegular,
    titleFontSize,
    pageWidth - 200
  ).slice(0, 3);

  titleLines.forEach((line, index) => {
    drawCenteredText(page, line, {
      color: palette.ink,
      font: serifRegular,
      size: titleFontSize,
      y: pageHeight - 418 - (index * (titleFontSize + 4)),
    });
  });

  page.drawLine({
    start: { x: 120, y: 118 },
    end: { x: pageWidth - 120, y: 118 },
    color: palette.border,
    thickness: 1,
  });

  drawCenteredText(page, `Date of Issuance: ${formatIssueDate(issuedAt)}`, {
    color: palette.soft,
    font: sansRegular,
    size: 13,
    y: 88,
  });

  return pdfDoc.save();
};

const deleteCertificateFile = async (fileName) => {
  const filePath = resolveCertificateFilePath(fileName);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const deleteCertificatesForPaper = async (dbOrConnection, paperId) => {
  const [rows] = await dbOrConnection.query(
    `SELECT id, certificate_path
     FROM Certificates
     WHERE paper_id = ?
     FOR UPDATE`,
    [paperId]
  );

  for (const row of rows) {
    if (row.certificate_path) {
      await deleteCertificateFile(row.certificate_path);
    }
  }

  if (rows.length > 0) {
    await dbOrConnection.query('DELETE FROM Certificates WHERE paper_id = ?', [paperId]);
  }

  return rows;
};

const generateCertificateFile = async ({ paperId, authorName, paperTitle, conferenceTitle, issuedAt = new Date() }) => {
  await ensureCertificatesDirectory();

  const certificatePath = buildCertificateFileName(paperId, paperTitle);
  const absolutePath = resolveCertificateFilePath(certificatePath);
  const pdfBytes = await buildCertificatePdf({
    authorName,
    paperTitle,
    conferenceTitle,
    issuedAt,
  });

  await fs.writeFile(absolutePath, pdfBytes);

  return { certificatePath, issuedAt };
};

module.exports = {
  deleteCertificateFile,
  deleteCertificatesForPaper,
  ensureCertificatesDirectory,
  generateCertificateFile,
  resolveCertificateFilePath,
};
