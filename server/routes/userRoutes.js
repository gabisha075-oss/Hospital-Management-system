const express = require('express');
const router = express.Router();
const { getAllUsers, deleteUser } = require('../controllers/userController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, roleMiddleware(['admin']), getAllUsers);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteUser);

module.exports = router;
