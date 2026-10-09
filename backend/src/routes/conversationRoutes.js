const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { verifyToken } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(verifyToken);
router.use(apiLimiter);

router.post('/', conversationController.createConversation);
router.get('/', conversationController.listConversations);
router.get('/:id', conversationController.getConversation);
router.put('/:id', conversationController.renameConversation);
router.delete('/:id', conversationController.deleteConversation);
router.post('/:id/clear', conversationController.clearConversationMessages);

module.exports = router;
