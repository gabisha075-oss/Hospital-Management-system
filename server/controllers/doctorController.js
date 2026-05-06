const pool = require('../config/db');

exports.getAllDoctors = async (req, res) => {
    try {
        const [doctors] = await pool.query(`
      SELECT d.*, u.name, u.email, dep.name as department_name 
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      JOIN departments dep ON d.department_id = dep.id
    `);
        res.json({ success: true, doctors });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getDoctorById = async (req, res) => {
    try {
        const [doctor] = await pool.query(`
      SELECT d.*, u.name, u.email, dep.name as department_name 
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      JOIN departments dep ON d.department_id = dep.id
      WHERE d.id = ?
    `, [req.params.id]);
        res.json({ success: true, doctor: doctor[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateDoctorStatus = async (req, res) => {
    const { id } = req.params;
    const { availability_status } = req.body;
    try {
        await pool.query('UPDATE doctors SET availability_status = ? WHERE id = ?', [availability_status, id]);
        res.json({ success: true, message: 'Doctor status updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteDoctor = async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Get user_id first
        const [doctor] = await connection.query('SELECT user_id FROM doctors WHERE id = ?', [id]);
        if (doctor.length === 0) {
            return connection.rollback();
            res.status(404).json({ success: false, message: 'Doctor not found' });
        }
        const userId = doctor[0].user_id;

        // Delete related records
        await connection.query('DELETE FROM appointments WHERE doctor_id = ?', [id]);

        // Delete doctor
        await connection.query('DELETE FROM doctors WHERE id = ?', [id]);
        // Delete user
        await connection.query('DELETE FROM users WHERE id = ?', [userId]);

        await connection.commit();
        res.json({ success: true, message: 'Doctor and associated records deleted successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Delete doctor error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};
