const express = require('express');
const router = express.Router();
const { getAllDoctors, getDoctorById, updateDoctorStatus } = require('../controllers/doctorController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, getAllDoctors);
router.get('/:id', authMiddleware, getDoctorById);
router.patch('/:id/status', authMiddleware, roleMiddleware(['admin', 'doctor']), updateDoctorStatus);

router.delete('/:id', authMiddleware, roleMiddleware(['admin']), require('../controllers/doctorController').deleteDoctor);

module.exports = router;
