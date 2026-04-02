// routes/discussionRoutes.js
// Feature 5 — Review Discussion System

const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getDiscussions,
  postDiscussionMessage,
  deleteDiscussionMessage
} = require('../controllers/discussionController');

// Get discussion thread for a paper (reviewer assigned to it or admin)
router.get('/:paper_id', auth, authorize('reviewer', 'admin'), getDiscussions);

// Reviewer posts a new message in the discussion
router.post('/:paper_id', auth, authorize('reviewer'), postDiscussionMessage);

// Delete a discussion message
router.delete('/message/:discussion_id', auth, authorize('reviewer', 'admin'), deleteDiscussionMessage);

module.exports = router;
