const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getMyNotifications, markAsRead } = require('../controllers/notificationController');
const { downloadCertificate, getMyCertificates } = require('../controllers/certificateController');

router.get('/notifications', auth, getMyNotifications);
router.put('/notifications/read', auth, markAsRead);
router.get('/certificates', auth, getMyCertificates);
router.get('/certificates/:paper_id/download', auth, downloadCertificate);

module.exports = router;
