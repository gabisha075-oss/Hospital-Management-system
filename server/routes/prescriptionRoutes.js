const express = require('express');
const router = express.Router();
const { 
    createPrescription, 
    getPrescriptions, 
    getPrescriptionById,
    dispensePrescription,
    getPrescriptionsByPatient,
    getPendingPrescriptions,
    cancelPrescription,
    markPatientWaitingForLab
} = require('../controllers/prescriptionController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Doctor creates prescription
router.post('/', authMiddleware, roleMiddleware(['doctor']), createPrescription);

// Get all prescriptions
router.get('/', authMiddleware, roleMiddleware(['pharmacist', 'admin']), getPrescriptions);

// Get pending prescriptions only
router.get('/pending', authMiddleware, roleMiddleware(['pharmacist', 'admin']), getPendingPrescriptions);

// Doctor sends patient to waiting after selecting lab tests
router.post('/waiting', authMiddleware, roleMiddleware(['doctor']), markPatientWaitingForLab);

// Get prescriptions for a specific patient
router.get('/patient/:patient_id', authMiddleware, getPrescriptionsByPatient);

// Get prescription by ID
router.get('/:id', authMiddleware, getPrescriptionById);

// Dispense prescription (pharmacist/admin)
router.patch('/:id/dispense', authMiddleware, roleMiddleware(['pharmacist', 'admin']), dispensePrescription);

// Cancel prescription (doctor/admin)
router.patch('/:id/cancel', authMiddleware, roleMiddleware(['doctor', 'admin']), cancelPrescription);

module.exports = router;
