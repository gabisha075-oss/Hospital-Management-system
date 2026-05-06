const express = require('express');
const router = express.Router();
const bedController = require('../controllers/bedController');
const { authMiddleware } = require('../middleware/auth');

// Ward management routes
router.get('/wards', authMiddleware, bedController.getAllWards);
router.post('/wards', authMiddleware, bedController.addWard);
router.delete('/wards/:wardId', authMiddleware, bedController.deleteWard);

// Bed management routes
router.get('/wards/:ward_id/beds', authMiddleware, bedController.getBedsByWard);
router.post('/wards/:ward_id/beds', authMiddleware, bedController.addBed);

// Bed availability and reservation routes
router.get('/available', authMiddleware, bedController.getAvailableBeds);
router.post('/reserve', authMiddleware, bedController.reserveBed);
router.put('/:bed_id/discharge', authMiddleware, bedController.dischargePatient);
router.put('/:bed_id/transfer', authMiddleware, bedController.transferPatient);

// Patient bed history routes
router.get('/patient/:patient_id/history', authMiddleware, bedController.getPatientBedHistory);

// Bed occupancy and statistics routes
router.get('/occupancy', authMiddleware, bedController.getBedOccupancy);
router.get('/stats', authMiddleware, bedController.getBedStats);

module.exports = router;
