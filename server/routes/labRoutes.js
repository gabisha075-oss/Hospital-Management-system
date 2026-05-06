const express = require('express');
const router = express.Router();
const { uploadReport, getReportsByPatient } = require('../controllers/labController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/upload', authMiddleware, roleMiddleware(['admin', 'lab']), uploadReport);
router.get('/patient/:patient_id', authMiddleware, getReportsByPatient);

module.exports = router;
