const express = require('express');
const router = express.Router();
const {
    getStats,
    getLivePatientFlow,
    getReceptionistDashboard,
    streamLivePatientFlow
} = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/auth');

router.get('/stats', authMiddleware, getStats);
router.get('/live-flow', authMiddleware, getLivePatientFlow);
router.get('/live-flow/stream', streamLivePatientFlow);
router.get('/receptionist', authMiddleware, getReceptionistDashboard);

module.exports = router;
