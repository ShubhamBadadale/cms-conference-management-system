const db = require('../config/db');
const { buildProceedingsPdf } = require('../services/proceedingsService');
const { deleteCertificatesForPaper } = require('../services/certificateService');
const { getEmailQueueOverview, queueReviewFeedbackEmail } = require('../services/emailQueueService');
const { getTopReviewerSuggestions } = require('../services/reviewerMatcher');

const finalPaperStatuses = new Set(['accepted', 'rejected']);

const formatDecisionLabel = (status) => {
  const labels = {
    accepted: 'ACCEPTED',
    rejected: 'REJECTED',
    revision: 'REVISION REQUESTED',
  };

  return labels[status] || String(status || '').replace(/_/g, ' ').toUpperCase();
};

const getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, role, institution, is_active, created_at
       FROM Users
       ORDER BY CASE WHEN role = 'pending' THEN 0 ELSE 1 END, created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const assignUserRole = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;
    const validAssignableRoles = ['author', 'reviewer', 'coordinator'];

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'Valid user id is required' });
    }

    if (!validAssignableRoles.includes(role)) {
      return res.status(400).json({ message: 'Role must be author, reviewer, or coordinator' });
    }

    const [users] = await db.query(
      'SELECT id, name, email, role, is_active FROM Users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(400).json({ message: 'Inactive users must be reactivated before approval' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin accounts cannot be changed here' });
    }

    if (user.role !== 'pending') {
      return res.status(400).json({ message: 'Only pending users can be approved' });
    }

    await db.query('UPDATE Users SET role = ? WHERE id = ?', [role, userId]);
    await db.query(
      'INSERT INTO Notifications (user_id, message) VALUES (?, ?)',
      [userId, `Your account has been approved as ${role}. You can now sign in.`]
    );

    res.json({
      message: `User approved as ${role}`,
      user: { ...user, role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateUserActiveState = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const isActive = Boolean(req.body?.is_active);

    const [users] = await db.query(
      'SELECT id, name, role, is_active FROM Users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    if (user.id === req.user.id && !isActive) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    if (user.role === 'admin' && !isActive) {
      const [[counts]] = await db.query(
        "SELECT COUNT(*) AS active_admins FROM Users WHERE role = 'admin' AND is_active = TRUE"
      );
      if (counts.active_admins <= 1) {
        return res.status(400).json({ message: 'At least one active admin account is required' });
      }
    }

    await db.query('UPDATE Users SET is_active = ? WHERE id = ?', [isActive, userId]);

    res.json({
      message: `User ${isActive ? 'reactivated' : 'archived'} successfully`,
      user: { ...user, is_active: isActive },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getReviewers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.institution,
        u.is_active,
        COUNT(DISTINCT CASE WHEN p.is_active = TRUE THEN ra.paper_id END) AS assigned_count
       FROM Users u
       LEFT JOIN ReviewerAssignments ra ON u.id = ra.reviewer_id
       LEFT JOIN Papers p ON p.id = ra.paper_id
       WHERE u.role = 'reviewer'
       GROUP BY u.id, u.name, u.email, u.institution, u.is_active
       ORDER BY u.is_active DESC, assigned_count ASC, u.name ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const assignReviewer = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { paper_id, reviewer_id } = req.body;

    if (!paper_id || !reviewer_id) {
      return res.status(400).json({ message: 'paper_id and reviewer_id are required' });
    }

    await connection.beginTransaction();

    const [papers] = await connection.query(
      `SELECT id, title, status
       FROM Papers
       WHERE id = ? AND is_active = TRUE
       FOR UPDATE`,
      [paper_id]
    );

    if (papers.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Paper not found' });
    }

    if (finalPaperStatuses.has(papers[0].status)) {
      await connection.rollback();
      return res.status(409).json({
        message: 'Finalized papers cannot receive new reviewer assignments.',
      });
    }

    const [reviewers] = await connection.query(
      `SELECT id, role, is_active
       FROM Users
       WHERE id = ?`,
      [reviewer_id]
    );

    if (reviewers.length === 0 || reviewers[0].role !== 'reviewer' || !reviewers[0].is_active) {
      await connection.rollback();
      return res.status(400).json({ message: 'Invalid reviewer' });
    }

    const [existing] = await connection.query(
      `SELECT id
       FROM ReviewerAssignments
       WHERE paper_id = ? AND reviewer_id = ?`,
      [paper_id, reviewer_id]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: 'Reviewer already assigned' });
    }

    await connection.query(
      'INSERT INTO ReviewerAssignments (paper_id, reviewer_id) VALUES (?, ?)',
      [paper_id, reviewer_id]
    );

    if (papers[0].status === 'submitted') {
      await connection.query(
        "UPDATE Papers SET status = 'under_review' WHERE id = ?",
        [paper_id]
      );
    }

    await connection.query(
      'INSERT INTO Notifications (user_id, message) VALUES (?, ?)',
      [reviewer_id, `You have been assigned to review: "${papers[0].title}"`]
    );

    await connection.commit();
    res.json({ message: 'Reviewer assigned successfully' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
};

const makeDecision = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { paper_id, status } = req.body;
    const validStatuses = ['accepted', 'rejected', 'revision'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await connection.beginTransaction();

    const [papers] = await connection.query(
      `SELECT
        p.id,
        p.title,
        p.author_id,
        p.status,
        u.email AS author_email,
        u.name AS author_name,
        c.title AS conference_title
       FROM Papers p
       JOIN Users u ON u.id = p.author_id
       JOIN Conferences c ON c.id = p.conference_id
       WHERE p.id = ? AND p.is_active = TRUE
       FOR UPDATE`,
      [paper_id]
    );

    if (papers.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Paper not found' });
    }

    const paper = papers[0];

    if (finalPaperStatuses.has(paper.status)) {
      await connection.rollback();
      return res.status(409).json({
        message: 'This paper has already been finalized. Revoke the current decision before applying a new one.',
      });
    }

    await connection.query('UPDATE Papers SET status = ? WHERE id = ?', [status, paper_id]);

    const messages = {
      accepted: `Congratulations! Your paper "${paper.title}" has been ACCEPTED.`,
      rejected: `We regret to inform you that your paper "${paper.title}" has been REJECTED.`,
      revision: `Your paper "${paper.title}" requires REVISION. Please check reviewer comments.`,
    };

    await connection.query(
      'INSERT INTO Notifications (user_id, message) VALUES (?, ?)',
      [paper.author_id, messages[status]]
    );

    const [reviews] = await connection.query(
      `SELECT originality_score, technical_quality_score, clarity_score, relevance_score, total_score, comments
       FROM Reviews
       WHERE paper_id = ?
       ORDER BY review_date ASC`,
      [paper_id]
    );

    await queueReviewFeedbackEmail(
      {
        paperId: paper.id,
        userId: paper.author_id,
        recipientEmail: paper.author_email,
        subject: `ConferMS decision update: ${paper.title}`,
        payload: {
          authorName: paper.author_name,
          paperTitle: paper.title,
          conferenceTitle: paper.conference_title,
          decision: status,
          decisionLabel: formatDecisionLabel(status),
          reviews,
        },
      },
      connection
    );

    await connection.commit();
    res.json({ message: `Paper status updated to ${status}` });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
};

const revokeDecision = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const paperId = Number(req.params.id);

    if (!Number.isInteger(paperId) || paperId <= 0) {
      return res.status(400).json({ message: 'Valid paper id is required' });
    }

    await connection.beginTransaction();

    const [papers] = await connection.query(
      `SELECT id, title, status
       FROM Papers
       WHERE id = ? AND is_active = TRUE
       FOR UPDATE`,
      [paperId]
    );

    if (papers.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Paper not found' });
    }

    const paper = papers[0];

    if (!finalPaperStatuses.has(paper.status)) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Only accepted or rejected decisions can be revoked.',
      });
    }

    if (paper.status === 'accepted') {
      await deleteCertificatesForPaper(connection, paper.id);
    }

    await connection.query(
      "UPDATE Papers SET status = 'under_review' WHERE id = ?",
      [paper.id]
    );

    await connection.commit();
    res.json({ message: 'Decision revoked. Paper returned to under review.' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    connection.release();
  }
};

const getAcceptedPapers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        p.*,
        u.name AS author_name,
        u.institution,
        c.title AS conference_title,
        AVG(r.total_score) AS avg_score
       FROM Papers p
       JOIN Users u ON p.author_id = u.id
       JOIN Conferences c ON p.conference_id = c.id
       LEFT JOIN Reviews r ON p.id = r.paper_id
       WHERE p.status = 'accepted'
         AND p.is_active = TRUE
         AND u.is_active = TRUE
         AND c.is_active = TRUE
       GROUP BY p.id, u.name, u.institution, c.title
       ORDER BY avg_score DESC, p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const sendNotification = async (req, res) => {
  try {
    const { user_id, message } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    if (user_id === 'all') {
      const [users] = await db.query('SELECT id FROM Users WHERE is_active = TRUE');
      for (const user of users) {
        await db.query('INSERT INTO Notifications (user_id, message) VALUES (?, ?)', [user.id, message]);
      }
    } else {
      await db.query(
        'INSERT INTO Notifications (user_id, message) SELECT id, ? FROM Users WHERE id = ? AND is_active = TRUE',
        [message, user_id]
      );
    }
    res.json({ message: 'Notification sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [[{ total_papers }]] = await db.query(
      'SELECT COUNT(*) AS total_papers FROM Papers WHERE is_active = TRUE'
    );
    const [[{ total_users }]] = await db.query(
      'SELECT COUNT(*) AS total_users FROM Users WHERE is_active = TRUE'
    );
    const [[{ total_conferences }]] = await db.query(
      'SELECT COUNT(*) AS total_conferences FROM Conferences WHERE is_active = TRUE'
    );
    const [[{ accepted }]] = await db.query(
      "SELECT COUNT(*) AS accepted FROM Papers WHERE status = 'accepted' AND is_active = TRUE"
    );
    const [[{ rejected }]] = await db.query(
      "SELECT COUNT(*) AS rejected FROM Papers WHERE status = 'rejected' AND is_active = TRUE"
    );
    const [[{ under_review }]] = await db.query(
      "SELECT COUNT(*) AS under_review FROM Papers WHERE status = 'under_review' AND is_active = TRUE"
    );
    const [[{ flagged_for_review }]] = await db.query(
      "SELECT COUNT(*) AS flagged_for_review FROM Papers WHERE status = 'flagged_for_review' AND is_active = TRUE"
    );

    res.json({
      total_papers,
      total_users,
      total_conferences,
      accepted,
      rejected,
      under_review,
      flagged_for_review,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getConferenceMetricsOverview = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        conference_id,
        conference_title,
        total_papers,
        accepted_papers,
        rejected_papers,
        revision_papers,
        under_review_papers,
        active_reviewers,
        avg_review_score,
        avg_presentation_score
       FROM vw_conference_metrics_olap
       ORDER BY total_papers DESC, conference_title ASC`
    );

    res.json({
      connected: true,
      source: 'vw_conference_metrics_olap',
      generatedFrom: 'vw_conference_metrics_olap',
      items: rows,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getAdminEmailQueue = async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const overview = await getEmailQueueOverview(limit);
    res.json(overview);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getReviewerSuggestions = async (req, res) => {
  try {
    const suggestions = await getTopReviewerSuggestions(db, req.params.paper_id, 3);
    res.json(suggestions);
  } catch (err) {
    const status = err.message === 'Paper not found' ? 404 : 400;
    res.status(status).json({ message: err.message });
  }
};

const updateConferenceActiveState = async (req, res) => {
  try {
    const conferenceId = Number(req.params.id);
    const isActive = Boolean(req.body?.is_active);

    const [conferences] = await db.query(
      'SELECT id, title, is_active FROM Conferences WHERE id = ?',
      [conferenceId]
    );

    if (conferences.length === 0) {
      return res.status(404).json({ message: 'Conference not found' });
    }

    await db.query('UPDATE Conferences SET is_active = ? WHERE id = ?', [isActive, conferenceId]);
    res.json({
      message: `Conference ${isActive ? 'reactivated' : 'archived'} successfully`,
      conference: { ...conferences[0], is_active: isActive },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updatePaperActiveState = async (req, res) => {
  try {
    const paperId = Number(req.params.id);
    const isActive = Boolean(req.body?.is_active);

    const [papers] = await db.query(
      'SELECT id, title, is_active FROM Papers WHERE id = ?',
      [paperId]
    );

    if (papers.length === 0) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    await db.query('UPDATE Papers SET is_active = ? WHERE id = ?', [isActive, paperId]);
    res.json({
      message: `Paper ${isActive ? 'reactivated' : 'archived'} successfully`,
      paper: { ...papers[0], is_active: isActive },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const downloadConferenceProceedings = async (req, res) => {
  try {
    const { buffer, conferenceTitle } = await buildProceedingsPdf(req.params.conference_id);
    const fileName = `${conferenceTitle.replace(/[^a-z0-9-_]+/gi, '_')}-proceedings.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ message: err.message });
  }
};

module.exports = {
  assignReviewer,
  assignUserRole,
  downloadConferenceProceedings,
  getAdminEmailQueue,
  getAcceptedPapers,
  getAllUsers,
  getConferenceMetricsOverview,
  getDashboardStats,
  getReviewerSuggestions,
  getReviewers,
  makeDecision,
  revokeDecision,
  sendNotification,
  updateConferenceActiveState,
  updatePaperActiveState,
  updateUserActiveState,
};
