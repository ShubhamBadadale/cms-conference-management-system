const db = require("../config/db");

const REVIEWER_PAPER_LIMIT = 5;

/* ---------------- USERS ---------------- */

const getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, role, institution, created_at FROM Users ORDER BY created_at DESC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ---------------- REVIEWERS ---------------- */

const getReviewers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.institution,
        COUNT(ra.paper_id) AS assigned_papers
      FROM Users u
      LEFT JOIN ReviewerAssignments ra
        ON u.id = ra.reviewer_id
      WHERE u.role = 'reviewer'
      GROUP BY u.id
      ORDER BY assigned_papers DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ---------------- ASSIGN REVIEWER ---------------- */

const assignReviewer = async (req, res) => {
  try {
    const { paper_id, reviewer_id } = req.body;

    const [reviewer] = await db.query(
      "SELECT id FROM Users WHERE id = ? AND role = 'reviewer'",
      [reviewer_id],
    );

    if (reviewer.length === 0) {
      return res.status(400).json({ message: "Invalid reviewer" });
    }

    const [[{ assigned_count }]] = await db.query(
      "SELECT COUNT(*) AS assigned_count FROM ReviewerAssignments WHERE reviewer_id = ?",
      [reviewer_id],
    );

    if (assigned_count >= REVIEWER_PAPER_LIMIT) {
      return res.status(409).json({
        message: `Reviewer has reached limit (${REVIEWER_PAPER_LIMIT})`,
      });
    }

    const [existing] = await db.query(
      "SELECT id FROM ReviewerAssignments WHERE paper_id = ? AND reviewer_id = ?",
      [paper_id, reviewer_id],
    );

    if (existing.length > 0) {
      return res
        .status(409)
        .json({ message: "Reviewer already assigned to this paper" });
    }

    await db.query(
      "INSERT INTO ReviewerAssignments (paper_id, reviewer_id) VALUES (?, ?)",
      [paper_id, reviewer_id],
    );

    await db.query(
      "UPDATE Papers SET status = 'under_review' WHERE id = ? AND status = 'submitted'",
      [paper_id],
    );

    res.json({ message: "Reviewer assigned successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ---------------- DECISION ---------------- */

const makeDecision = async (req, res) => {
  try {
    const { paper_id, status } = req.body;

    await db.query("UPDATE Papers SET status = ? WHERE id = ?", [
      status,
      paper_id,
    ]);

    res.json({ message: `Paper marked as ${status}` });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ---------------- ACCEPTED PAPERS ---------------- */

const getAcceptedPapers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.*, 
        u.name AS author_name, 
        c.title AS conference_title,
        AVG(r.total_score) AS avg_score
      FROM Papers p
      JOIN Users u ON p.author_id = u.id
      JOIN Conferences c ON p.conference_id = c.id
      LEFT JOIN Reviews r ON p.id = r.paper_id
      WHERE p.status = 'accepted'
      GROUP BY p.id
      ORDER BY avg_score DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ---------------- DASHBOARD STATS ---------------- */

const getDashboardStats = async (req, res) => {
  try {
    const [[papers]] = await db.query(
      "SELECT COUNT(*) AS total_papers FROM Papers",
    );
    const [[users]] = await db.query(
      "SELECT COUNT(*) AS total_users FROM Users",
    );
    const [[conferences]] = await db.query(
      "SELECT COUNT(*) AS total_conferences FROM Conferences",
    );

    const [[accepted]] = await db.query(
      "SELECT COUNT(*) AS accepted FROM Papers WHERE status = 'accepted'",
    );

    const [[rejected]] = await db.query(
      "SELECT COUNT(*) AS rejected FROM Papers WHERE status = 'rejected'",
    );

    const [[underReview]] = await db.query(
      "SELECT COUNT(*) AS under_review FROM Papers WHERE status = 'under_review'",
    );

    const [[reviews]] = await db.query(
      "SELECT COUNT(*) AS total_reviews FROM Reviews",
    );

    res.json({
      total_papers: papers.total_papers,
      total_users: users.total_users,
      total_conferences: conferences.total_conferences,
      accepted: accepted.accepted,
      rejected: rejected.rejected,
      under_review: underReview.under_review,
      total_reviews: reviews.total_reviews,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getAllUsers,
  getReviewers,
  assignReviewer,
  makeDecision,
  getAcceptedPapers,
  getDashboardStats,
};
