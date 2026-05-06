const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { name, email, password, role, patient_type, age, gender, blood_group, phone, address } = req.body;
    try {
        const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role || 'patient']
        );

        const userId = result.insertId;

        let createdPatientId = null;
        let createdDoctorId = null;

        if (role === 'patient') {
            const [patientInsert] = await pool.query(
                'INSERT INTO patients (user_id, patient_type, age, gender, blood_group, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, patient_type || 'outpatient', age, gender, blood_group, phone, address]
            );
            createdPatientId = patientInsert.insertId;
        } else if (role === 'doctor') {
            const { department_id, specialization, experience } = req.body;
            const [doctorInsert] = await pool.query(
                'INSERT INTO doctors (user_id, department_id, specialization, experience) VALUES (?, ?, ?, ?)',
                [userId, department_id, specialization, experience]
            );
            createdDoctorId = doctorInsert.insertId;
        }

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user_id: userId,
                patient_id: createdPatientId,
                doctor_id: createdDoctorId
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
        res.json({ success: true, user: users[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
