const express = require('express');
const router = express.Router();
const {
    getAllPatients,
    getPatientById,
    updatePatient,
    getPatientProfile,
    admitPatient,
    dischargePatient,
    getInpatientStats,
    getInpatients,
    getConsultationHistory,
    getPendingAdmissionRequests,
    processAdmissionRequest
} = require('../controllers/patientController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Static routes first (no parameters)
router.get('/profile/me', authMiddleware, getPatientProfile);
router.get('/inpatients/stats', authMiddleware, getInpatientStats);
router.get('/inpatients/all', authMiddleware, getInpatients);
router.get('/admission-requests/pending', authMiddleware, roleMiddleware(['receptionist', 'admin']), getPendingAdmissionRequests);
router.patch('/admission-requests/:id/process', authMiddleware, roleMiddleware(['receptionist', 'admin']), processAdmissionRequest);

// Parameterized routes (sorted by specificity)
// More specific patterns before generic patterns
router.get('/:id/consultations', getConsultationHistory); // Temporarily removed auth for testing

// Generic routes
router.get('/', authMiddleware, roleMiddleware(['admin', 'receptionist', 'lab','pharmacist']), getAllPatients);
router.get('/:id', authMiddleware, getPatientById);
router.put('/:id', authMiddleware, updatePatient);

// Inpatient management routes
router.post('/admit', authMiddleware, admitPatient);
router.post('/discharge', authMiddleware, dischargePatient);

router.delete('/:id', authMiddleware, roleMiddleware(['admin']), require('../controllers/patientController').deletePatient);

module.exports = router;
