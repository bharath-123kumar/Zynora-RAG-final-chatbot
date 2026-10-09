const express = require('express');
const router = express.Router();
const knowledgeController = require('../controllers/knowledgeController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(verifyToken);
router.use(requireAdmin);
router.use(apiLimiter);

router.get('/documents', knowledgeController.listDocuments);
router.post('/documents', knowledgeController.createDocument);
router.put('/documents/:id/status', knowledgeController.updateDocumentStatus);
router.post('/reindex', knowledgeController.reindexKnowledge);
router.delete('/documents/:id', knowledgeController.deleteDocument);

module.exports = router;
