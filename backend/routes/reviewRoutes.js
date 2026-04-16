const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { getAssignedPapers, getReviewerWorkload, submitReview, getReviewsForPaper } = require('../controllers/reviewController');

router.get('/assigned', auth, authorize('reviewer'), getAssignedPapers);
router.get('/workload', auth, authorize('reviewer'), getReviewerWorkload);
router.post('/submit', auth, authorize('reviewer'), submitReview);
router.get('/paper/:paper_id', auth, authorize('admin', 'coordinator'), getReviewsForPaper);

module.exports = router;
