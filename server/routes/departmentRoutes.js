const express = require('express');
const router = express.Router();
const { getAllDepartments, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, getAllDepartments);
router.post('/', authMiddleware, roleMiddleware(['admin']), createDepartment);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), updateDepartment);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteDepartment);

module.exports = router;
