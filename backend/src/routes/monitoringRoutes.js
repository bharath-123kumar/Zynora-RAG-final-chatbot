const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(verifyToken);
router.use(requireAdmin);
router.use(apiLimiter);

router.get('/metrics', monitoringController.getMonitoringMetrics);

module.exports = router;
