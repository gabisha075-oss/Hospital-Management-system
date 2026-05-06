const express = require('express');
const router = express.Router();
const labTestController = require('../controllers/labTestController');
const { authMiddleware } = require('../middleware/auth');

// Lab test template - for doctors to see available tests
router.get('/templates/available', authMiddleware, labTestController.getLabTestTemplates);

// Doctor routes
router.post('/request', authMiddleware, labTestController.createLabTest);

// Lab staff and admin routes
router.get('/all', authMiddleware, labTestController.getAllLabTests);
router.get('/pending', authMiddleware, labTestController.getPendingLabTests);
router.get('/stats', authMiddleware, labTestController.getLabTestStats);

// Patient specific routes
router.get('/patient/:patient_id', authMiddleware, labTestController.getLabTestsByPatient);
router.get('/patient/:patient_id/completed', authMiddleware, labTestController.getCompletedLabTestsByPatient);

// Lab test management routes
router.get('/:id', authMiddleware, labTestController.getLabTestById);
router.put('/:id/assign', authMiddleware, labTestController.assignLabTest);
router.put('/:id/results', authMiddleware, labTestController.updateLabTestResults);
router.put('/:id/complete', authMiddleware, labTestController.completeLabTest);
router.put('/:id/cancel', authMiddleware, labTestController.cancelLabTest);

module.exports = router;
