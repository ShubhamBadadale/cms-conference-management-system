// routes/conflictRoutes.js
// Feature 1 — Conflict of Interest

const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  declareConflict,
  adminFlagConflict,
  getConflictsForPaper,
  getMyConflicts
} = require('../controllers/conflictController');

// Reviewer declares COI
router.post('/declare', auth, authorize('reviewer'), declareConflict);

// Reviewer views their own COI declarations
router.get('/mine', auth, authorize('reviewer'), getMyConflicts);

// Admin flags a COI manually
router.post('/admin-flag', auth, authorize('admin'), adminFlagConflict);

// Admin views all COI for a paper
router.get('/paper/:paper_id', auth, authorize('admin'), getConflictsForPaper);

module.exports = router;
