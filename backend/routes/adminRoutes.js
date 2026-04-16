const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getAllUsers, assignUserRole, getReviewers, assignReviewer, makeDecision,
  getAcceptedPapers, sendNotification, generateCertificate, getDashboardStats
} = require('../controllers/adminController');

router.get('/users', auth, authorize('admin'), getAllUsers);
router.patch('/users/:id/role', auth, authorize('admin'), assignUserRole);
router.get('/reviewers', auth, authorize('admin'), getReviewers);
router.post('/assign-reviewer', auth, authorize('admin'), assignReviewer);
router.post('/decision', auth, authorize('admin'), makeDecision);
router.get('/accepted-papers', auth, authorize('admin', 'coordinator'), getAcceptedPapers);
router.post('/notify', auth, authorize('admin'), sendNotification);
router.post('/generate-certificate', auth, authorize('admin'), generateCertificate);
router.get('/stats', auth, authorize('admin'), getDashboardStats);

module.exports = router;
