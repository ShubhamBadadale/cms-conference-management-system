const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const { getNoSqlAnalytics } = require('../controllers/nosqlController');

router.get('/analytics', auth, authorize('admin'), getNoSqlAnalytics);

module.exports = router;
