const express = require('express');
const router = express.Router();
const clauseController = require('../controllers/clauseController');

router.get('/', clauseController.getClauseList);
router.get('/categories', clauseController.getCategories);
router.get('/recommend', clauseController.recommendClauses);
router.get('/:id', clauseController.getClauseDetail);
router.post('/', clauseController.createClause);
router.put('/:id', clauseController.updateClause);
router.delete('/:id', clauseController.deleteClause);

module.exports = router;
