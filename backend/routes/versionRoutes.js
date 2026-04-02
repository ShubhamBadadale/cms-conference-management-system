// routes/versionRoutes.js
// Feature 4 — Paper Versioning

const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadNewVersion, getVersionHistory, downloadVersion } = require('../controllers/versionController');

// Author: upload a new version
router.post('/upload', auth, authorize('author'), upload.single('paper'), uploadNewVersion);

// Author / Admin / Reviewer: view version history
router.get('/:paper_id', auth, getVersionHistory);

// Download a specific version
router.get('/:paper_id/download/:version_number', auth, downloadVersion);

module.exports = router;
