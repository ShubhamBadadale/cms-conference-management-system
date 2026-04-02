const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const {
  getAllConferences, getAllConferencesAdmin, getConferenceById,
  createConference, publishConference, updateConference
} = require('../controllers/conferenceController');

router.get('/', getAllConferences);
router.get('/:id', auth, getConferenceById);
router.get('/admin/all', auth, authorize('admin'), getAllConferencesAdmin);
router.post('/', auth, authorize('admin'), createConference);
router.put('/:id/publish', auth, authorize('admin'), publishConference);
router.put('/:id', auth, authorize('admin'), updateConference);

module.exports = router;
