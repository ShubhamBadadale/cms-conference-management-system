// routes/analyticsRoutes.js
// Features 7 & 8 — Analytics Views + Workload Monitoring

const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getPaperReviewSummary,
  getReviewerWorkload,
  getConferenceStats,
  getDecisionTrail
} = require('../controllers/analyticsController');

// Feature 8 — Paper review summary view
router.get('/paper-summary', auth, authorize('admin'), getPaperReviewSummary);

// Feature 7 — Reviewer workload monitoring
router.get('/reviewer-workload', auth, authorize('admin'), getReviewerWorkload);

// Conference-level stats
router.get('/conference/:conference_id', auth, authorize('admin'), getConferenceStats);

// Feature 6 — Full decision trail
router.get('/decisions', auth, authorize('admin'), getDecisionTrail);

module.exports = router;
