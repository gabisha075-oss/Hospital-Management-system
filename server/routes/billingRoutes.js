const express = require('express');
const router = express.Router();
const { createBill, getAllBills, generatePDF, getBillsByPatient, processBillPayment, getPatientServices, getPatientBillingTimeline } = require('../controllers/billingController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, roleMiddleware(['admin', 'receptionist']), createBill);
router.get('/', authMiddleware, roleMiddleware(['admin', 'receptionist']), getAllBills);
router.get('/patient/:patient_id', authMiddleware, getBillsByPatient);
router.get('/patient/:patient_id/services', authMiddleware, roleMiddleware(['admin', 'receptionist']), getPatientServices);
router.get('/patient/:patient_id/timeline', authMiddleware, roleMiddleware(['admin', 'receptionist']), getPatientBillingTimeline);
router.get('/:id/pdf', authMiddleware, generatePDF);
router.patch('/:id/pay', authMiddleware, processBillPayment);

module.exports = router;

