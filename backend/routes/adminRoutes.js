const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { generateCertificate } = require('../controllers/certificateController');
const {
  getAllUsers,
  assignUserRole,
  getReviewers,
  assignReviewer,
  makeDecision,
  revokeDecision,
  getAcceptedPapers,
  sendNotification,
  getAdminEmailQueue,
  getDashboardStats,
  getConferenceMetricsOverview,
  getReviewerSuggestions,
  updateUserActiveState,
  updateConferenceActiveState,
  updatePaperActiveState,
  downloadConferenceProceedings,
} = require('../controllers/adminController');

router.get('/users', auth, authorize('admin'), getAllUsers);
router.patch('/users/:id/role', auth, authorize('admin'), assignUserRole);
router.patch('/users/:id/active', auth, authorize('admin'), updateUserActiveState);
router.get('/reviewers', auth, authorize('admin'), getReviewers);
router.post('/assign-reviewer', auth, authorize('admin'), assignReviewer);
router.get('/papers/:paper_id/reviewer-suggestions', auth, authorize('admin'), getReviewerSuggestions);
router.patch('/papers/:id/active', auth, authorize('admin'), updatePaperActiveState);
router.post('/decision', auth, authorize('admin'), makeDecision);
router.post('/papers/:id/revoke-decision', auth, authorize('admin'), revokeDecision);
router.get('/accepted-papers', auth, authorize('admin', 'coordinator'), getAcceptedPapers);
router.post('/notify', auth, authorize('admin'), sendNotification);
router.post('/generate-certificate', auth, authorize('admin'), generateCertificate);
router.get('/stats', auth, authorize('admin'), getDashboardStats);
router.get('/email-queue', auth, authorize('admin'), getAdminEmailQueue);
router.get('/conference-metrics', auth, authorize('admin'), getConferenceMetricsOverview);
router.patch('/conferences/:id/active', auth, authorize('admin'), updateConferenceActiveState);
router.get('/conferences/:conference_id/proceedings/download', auth, authorize('admin'), downloadConferenceProceedings);

module.exports = router;
