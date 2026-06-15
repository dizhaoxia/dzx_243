const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');

router.post('/generate', pdfController.generatePdf);
router.post('/generate-signed', pdfController.generateSignedPdf);
router.get('/download/:documentId', pdfController.downloadPdf);
router.get('/download-signed/:id', pdfController.downloadSignedPdf);

module.exports = router;
