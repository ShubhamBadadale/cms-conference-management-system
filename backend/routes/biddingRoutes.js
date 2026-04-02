// routes/biddingRoutes.js
// Feature 2 — Reviewer Bidding System

const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getOpenPapersForBidding,
  submitBid,
  getBidsForPaper,
  getMyBids
} = require('../controllers/biddingController');

// Reviewer: view open papers for bidding (double-blind)
router.get('/open-papers', auth, authorize('reviewer'), getOpenPapersForBidding);

// Reviewer: submit or update a bid
router.post('/submit', auth, authorize('reviewer'), submitBid);

// Reviewer: view their own bids
router.get('/mine', auth, authorize('reviewer'), getMyBids);

// Admin: view all bids for a paper (for smart assignment)
router.get('/paper/:paper_id', auth, authorize('admin'), getBidsForPaper);

module.exports = router;
