const pool = require('../config/db');

exports.getAllDepartments = async (req, res) => {
    try {
        const [departments] = await pool.query('SELECT * FROM departments');
        res.json({ success: true, departments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createDepartment = async (req, res) => {
    const { name, description } = req.body;
    try {
        await pool.query('INSERT INTO departments (name, description) VALUES (?, ?)', [name, description]);
        res.status(201).json({ success: true, message: 'Department created' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        await pool.query('UPDATE departments SET name = ?, description = ? WHERE id = ?', [name, description, id]);
        res.json({ success: true, message: 'Department updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteDepartment = async (req, res) => {
    try {
        await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Department deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
