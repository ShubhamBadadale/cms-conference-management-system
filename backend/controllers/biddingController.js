// controllers/biddingController.js
// Feature 2 — Reviewer Bidding System

const db = require('../config/db');

/**
 * GET /api/bids/open-papers
 * Reviewer: see all papers available for bidding (blind — no author info).
 * Uses the reviewer_papers view (double-blind, Feature 3).
 */
const getOpenPapersForBidding = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT rp.*,
         COALESCE(b.bid_level, 'not_bid') AS my_bid
       FROM reviewer_papers rp
       LEFT JOIN Bids b ON rp.paper_id = b.paper_id AND b.reviewer_id = ?
       WHERE rp.status IN ('submitted', 'under_review')
       ORDER BY rp.paper_id`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * POST /api/bids/submit
 * Reviewer submits or updates a bid on a paper.
 * Body: { paper_id, bid_level: 'interested' | 'neutral' | 'not_interested' }
 */
const submitBid = async (req, res) => {
  try {
    const { paper_id, bid_level } = req.body;
    const reviewer_id = req.user.id;

    const validLevels = ['interested', 'neutral', 'not_interested'];
    if (!validLevels.includes(bid_level)) {
      return res.status(400).json({ message: 'bid_level must be: interested | neutral | not_interested' });
    }
    if (!paper_id) return res.status(400).json({ message: 'paper_id is required' });

    // Check for COI — reviewer cannot bid on a paper they have a conflict with
    const [conflict] = await db.query(
      'SELECT conflict_id FROM Conflicts WHERE paper_id = ? AND reviewer_id = ?',
      [paper_id, reviewer_id]
    );
    if (conflict.length > 0) {
      return res.status(403).json({ message: 'Cannot bid on a paper with a declared conflict of interest' });
    }

    // Upsert bid
    await db.query(
      `INSERT INTO Bids (paper_id, reviewer_id, bid_level)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE bid_level = VALUES(bid_level), bid_date = NOW()`,
      [paper_id, reviewer_id, bid_level]
    );

    res.json({ message: `Bid recorded: ${bid_level}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/bids/paper/:paper_id
 * Admin: get all bids for a paper to help with smart reviewer assignment.
 */
const getBidsForPaper = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.name AS reviewer_name, u.email, u.institution,
              wl.assigned_papers
       FROM Bids b
       JOIN Users u ON b.reviewer_id = u.id
       LEFT JOIN reviewer_workload wl ON b.reviewer_id = wl.reviewer_id
       WHERE b.paper_id = ?
       ORDER BY FIELD(b.bid_level, 'interested', 'neutral', 'not_interested')`,
      [req.params.paper_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * GET /api/bids/mine
 * Reviewer: see all their submitted bids.
 */
const getMyBids = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, p.title AS paper_title, c.title AS conference_title
       FROM Bids b
       JOIN Papers p ON b.paper_id = p.id
       JOIN Conferences c ON p.conference_id = c.id
       WHERE b.reviewer_id = ?
       ORDER BY b.bid_date DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getOpenPapersForBidding, submitBid, getBidsForPaper, getMyBids };
