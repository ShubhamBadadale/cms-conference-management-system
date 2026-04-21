const nodemailer = require('nodemailer');
const db = require('../config/db');
const { renderReviewFeedbackEmail } = require('../templates/reviewFeedbackEmail');

const SMTP_CONFIGURATION_ERROR =
  'SMTP is not configured on the server. Decision email could not be sent.';

let transporter;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getBatchSize = () => parsePositiveInt(process.env.EMAIL_BATCH_SIZE, 10);
const getMaxAttempts = () => parsePositiveInt(process.env.EMAIL_MAX_ATTEMPTS, 3);

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parsePositiveInt(process.env.SMTP_PORT, 587),
  secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

const getTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    throw new Error(SMTP_CONFIGURATION_ERROR);
  }

  if (!transporter) {
    transporter = createTransporter();
  }

  return transporter;
};

const queueReviewFeedbackEmail = async (
  { paperId, userId, recipientEmail, subject, payload },
  dbOrConnection = db
) => {
  const [result] = await dbOrConnection.query(
    `INSERT INTO EmailQueue (
      paper_id,
      user_id,
      email_type,
      recipient_email,
      subject,
      payload_json,
      status
    ) VALUES (?, ?, 'review_feedback', ?, ?, ?, 'pending')`,
    [paperId, userId, recipientEmail, subject, JSON.stringify(payload)]
  );

  return result.insertId;
};

const claimPendingEmails = async (limit) => {
  const [rows] = await db.query(
    `SELECT *
     FROM EmailQueue
     WHERE status = 'pending'
       AND scheduled_at <= CURRENT_TIMESTAMP
     ORDER BY scheduled_at ASC, id ASC
     LIMIT ?`,
    [limit]
  );

  const claimedRows = [];

  for (const row of rows) {
    const [updateResult] = await db.query(
      `UPDATE EmailQueue
       SET status = 'processing', updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'pending'`,
      [row.id]
    );

    if (updateResult.affectedRows === 1) {
      claimedRows.push(row);
    }
  }

  return claimedRows;
};

const markEmailSent = async (queueId) => {
  await db.query(
    `UPDATE EmailQueue
     SET status = 'sent',
         sent_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP,
         last_error = NULL
     WHERE id = ?`,
    [queueId]
  );
};

const markEmailFailed = async (queueRow, errorMessage) => {
  const nextAttemptCount = Number(queueRow.attempt_count || 0) + 1;
  const exhausted = nextAttemptCount >= getMaxAttempts();

  await db.query(
    `UPDATE EmailQueue
     SET status = ?,
         attempt_count = ?,
         last_error = ?,
         scheduled_at = CASE
           WHEN ? = 'pending' THEN DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)
           ELSE scheduled_at
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      exhausted ? 'failed' : 'pending',
      nextAttemptCount,
      errorMessage,
      exhausted ? 'failed' : 'pending',
      queueRow.id,
    ]
  );
};

const sendQueueRow = async (queueRow) => {
  const payload = typeof queueRow.payload_json === 'string'
    ? JSON.parse(queueRow.payload_json)
    : queueRow.payload_json;

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: queueRow.recipient_email,
    subject: queueRow.subject,
    html: renderReviewFeedbackEmail(payload),
  };

  await getTransporter().sendMail(mailOptions);
};

const processEmailQueue = async () => {
  const rows = await claimPendingEmails(getBatchSize());
  const summary = { claimed: rows.length, sent: 0, failed: 0 };

  for (const row of rows) {
    try {
      await sendQueueRow(row);
      await markEmailSent(row.id);
      summary.sent += 1;
    } catch (error) {
      await markEmailFailed(row, error.message || SMTP_CONFIGURATION_ERROR);
      summary.failed += 1;
    }
  }

  return summary;
};

const getEmailQueueOverview = async (limit = 20) => {
  const [summaryRows] = await db.query(
    `SELECT status, COUNT(*) AS count
     FROM EmailQueue
     GROUP BY status`
  );
  const [items] = await db.query(
    `SELECT
       eq.id,
       eq.email_type,
       eq.paper_id,
       p.title AS paper_title,
       eq.recipient_email,
       eq.subject,
       JSON_UNQUOTE(JSON_EXTRACT(eq.payload_json, '$.decision')) AS decision,
       JSON_UNQUOTE(JSON_EXTRACT(eq.payload_json, '$.conferenceTitle')) AS conference_title,
       eq.status,
       eq.attempt_count,
       eq.last_error,
       eq.created_at,
       eq.updated_at,
       eq.sent_at
     FROM EmailQueue eq
     LEFT JOIN Papers p ON p.id = eq.paper_id
     ORDER BY eq.updated_at DESC, eq.id DESC
     LIMIT ?`,
    [parsePositiveInt(limit, 20)]
  );

  const summary = {
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
  };

  for (const row of summaryRows) {
    summary[row.status] = Number(row.count || 0);
  }

  return { summary, items };
};

module.exports = {
  getEmailQueueOverview,
  processEmailQueue,
  queueReviewFeedbackEmail,
  SMTP_CONFIGURATION_ERROR,
};
