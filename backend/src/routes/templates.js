const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');

router.get('/', templateController.getTemplateList);
router.get('/:id', templateController.getTemplateDetail);
router.post('/', templateController.createTemplate);

module.exports = router;
