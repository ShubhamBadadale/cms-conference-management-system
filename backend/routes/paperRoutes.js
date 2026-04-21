const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { plagiarismCheck } = require('../middleware/plagiarismCheck');
const {
  submitPaper,
  getMySubmissions,
  getPaperById,
  resubmitPaper,
  getAllSubmissions,
  downloadPaper,
  getPaperReviews,
  getPaperVersionHistory,
} = require('../controllers/paperController');

router.post('/submit', auth, authorize('author'), upload.single('paper'), plagiarismCheck, submitPaper);
router.get('/my-submissions', auth, authorize('author'), getMySubmissions);
router.post('/resubmit', auth, authorize('author'), upload.single('paper'), plagiarismCheck, resubmitPaper);
router.get('/all', auth, authorize('admin', 'coordinator'), getAllSubmissions);
router.get('/:id/versions', auth, getPaperVersionHistory);
router.get('/:id/download', auth, downloadPaper);
router.get('/:paper_id/reviews', auth, authorize('author'), getPaperReviews);
router.get('/:id', auth, getPaperById);

module.exports = router;
