const express = require('express');
const router = express.Router();
const {
    checkInPatient,
    updatePatientStatus,
    checkOutPatient,
    getPatientFlowHistory,
    getCurrentPatientLocation,
    getActivePatients,
    getPatientMedicineHistory,
    getFlowDashboardStats
} = require('../controllers/patientFlowController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Check-in patient
router.post('/checkin', authMiddleware, roleMiddleware(['receptionist', 'admin']), checkInPatient);

// Update patient status
router.patch('/status', authMiddleware, roleMiddleware(['receptionist', 'pharmacist', 'lab', 'doctor', 'admin']), updatePatientStatus);

// Check-out patient
router.patch('/:patient_id/checkout', authMiddleware, roleMiddleware(['receptionist', 'admin']), checkOutPatient);

// Get flow history for a patient
router.get('/:patient_id/history', authMiddleware, getPatientFlowHistory);

// Get current location of patient
router.get('/:patient_id/current', authMiddleware, getCurrentPatientLocation);

// Get all active patients (for receptionist dashboard)
router.get('/', authMiddleware, roleMiddleware(['receptionist', 'admin', 'pharmacist']), getActivePatients);

// Get medicine history for patient (receptionist view)
router.get('/:patient_id/medicine-history', authMiddleware, roleMiddleware(['receptionist', 'admin']), getPatientMedicineHistory);

// Get flow dashboard statistics
router.get('/dashboard/stats', authMiddleware, roleMiddleware(['receptionist', 'admin']), getFlowDashboardStats);

module.exports = router;
