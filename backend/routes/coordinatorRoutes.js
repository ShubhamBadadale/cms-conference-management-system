const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { getPresentationSchedule, scorePresentation } = require('../controllers/coordinatorController');

router.get('/schedule', auth, authorize('coordinator'), getPresentationSchedule);
router.post('/score', auth, authorize('coordinator'), scorePresentation);

module.exports = router;
