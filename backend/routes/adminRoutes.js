const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  getReviewers,
  assignReviewer,
  makeDecision,
  getAcceptedPapers,
  getDashboardStats,
} = require("../controllers/adminController");

/* ---------- USERS ---------- */

router.get("/users", getAllUsers);

/* ---------- REVIEWERS ---------- */

router.get("/reviewers", getReviewers);

/* ---------- REVIEW ASSIGNMENT ---------- */

router.post("/assign-reviewer", assignReviewer);

/* ---------- PAPER DECISION ---------- */

router.post("/decision", makeDecision);

/* ---------- ACCEPTED PAPERS ---------- */

router.get("/accepted-papers", getAcceptedPapers);

/* ---------- DASHBOARD ---------- */

router.get("/stats", getDashboardStats);

module.exports = router;
