const express = require('express');
const router = express.Router();
const versionController = require('../controllers/versionController');

router.get('/document/:documentId', versionController.getVersionList);
router.get('/:id', versionController.getVersionDetail);
router.post('/', versionController.createVersion);
router.delete('/:id', versionController.deleteVersion);
router.get('/:id/download', versionController.downloadVersionPdf);

module.exports = router;
