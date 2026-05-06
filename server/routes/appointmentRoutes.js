const express = require('express');
const router = express.Router();
const { createAppointment, createWalkinAppointment, getAllAppointments, updateAppointmentStatus, claimWalkinAppointment, getPatientAppointments, getDoctorAppointments, getDoctorPatients } = require('../controllers/appointmentController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, createAppointment);
router.post('/walkin', authMiddleware, roleMiddleware(['receptionist', 'admin']), createWalkinAppointment);
router.get('/', authMiddleware, roleMiddleware(['admin', 'doctor', 'receptionist']), getAllAppointments);
router.get('/my', authMiddleware, getPatientAppointments);
router.get('/doctor/appointments', authMiddleware, roleMiddleware(['doctor']), getDoctorAppointments);
router.get('/doctor/patients', authMiddleware, roleMiddleware(['doctor']), getDoctorPatients);
router.patch('/:id/claim', authMiddleware, roleMiddleware(['doctor']), claimWalkinAppointment);
router.patch('/:id/status', authMiddleware, updateAppointmentStatus);

module.exports = router;
