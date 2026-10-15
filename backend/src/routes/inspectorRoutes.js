const express = require('express');
const router = express.Router();
const inspectorController = require('../controllers/inspectorController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(verifyToken);
router.use(requireAdmin);
router.use(apiLimiter);

// POST /api/admin/inspect — Live RAG pipeline inspection (admin only)
router.post('/inspect', inspectorController.inspectQuery);

module.exports = router;
