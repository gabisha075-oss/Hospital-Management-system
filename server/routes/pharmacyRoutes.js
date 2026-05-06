const express = require('express');
const router = express.Router();
const { 
    getAllMedicines, 
    getMedicineById,
    addMedicine, 
    updateStock, 
    updateMedicine, 
    deleteMedicine,
    issueMedicineToPatient,
    getLowStockMedicines,
    getMedicineUsageStats
} = require('../controllers/pharmacyController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

// Get all medicines
router.get('/medicines', authMiddleware, getAllMedicines);

// Get medicine by ID
router.get('/medicines/:id', authMiddleware, getMedicineById);

// Add new medicine
router.post('/medicines', authMiddleware, roleMiddleware(['admin', 'pharmacist']), addMedicine);

// Update medicine stocks
router.patch('/medicines/:id/stock', authMiddleware, roleMiddleware(['admin', 'pharmacist']), updateStock);

// Update medicine details
router.put('/medicines/:id', authMiddleware, roleMiddleware(['admin', 'pharmacist']), updateMedicine);

// Delete medicine
router.delete('/medicines/:id', authMiddleware, roleMiddleware(['admin', 'pharmacist']), deleteMedicine);

// Issue medicine directly to patient (not through prescription)
router.post('/issue-medicine', authMiddleware, roleMiddleware(['pharmacist', 'admin']), issueMedicineToPatient);

// Get low stock medicines
router.get('/medicines/low-stock', authMiddleware, roleMiddleware(['pharmacist', 'admin']), getLowStockMedicines);

// Get medicine usage statistics
router.get('/stats/usage', authMiddleware, roleMiddleware(['pharmacist', 'admin']), getMedicineUsageStats);

module.exports = router;
