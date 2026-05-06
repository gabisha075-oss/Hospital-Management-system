const pool = require('../config/db');

exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, name, email, role, created_at FROM users');
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
