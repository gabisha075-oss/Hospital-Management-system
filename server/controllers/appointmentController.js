const pool = require('../config/db');

exports.createAppointment = async (req, res) => {
    let { patient_id, doctor_id, appointment_date } = req.body;

    // If a patient is booking, ignore patient_id in body and use theirs
    if (req.user.role === 'patient') {
        try {
            const [patients] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
            if (patients.length > 0) {
                patient_id = patients[0].id;
            } else {
                return res.status(404).json({ success: false, message: 'Patient record not found' });
            }
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    try {
        await pool.query(
            'INSERT INTO appointments (patient_id, doctor_id, appointment_date) VALUES (?, ?, ?)',
            [patient_id, doctor_id, appointment_date]
        );
        res.status(201).json({ success: true, message: 'Appointment booked' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createWalkinAppointment = async (req, res) => {
    const { patient_id, priority = 'routine', notes = '' } = req.body;
    try {
        if (!patient_id) {
            return res.status(400).json({ success: false, message: 'patient_id is required for walk-in' });
        }

        const [patients] = await pool.query('SELECT id FROM patients WHERE id = ?', [patient_id]);
        if (patients.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const safePriority = ['routine', 'urgent', 'emergency'].includes(priority) ? priority : 'routine';

        const [tokenRows] = await pool.query(
            `SELECT COUNT(*) as total
             FROM appointments
             WHERE appointment_type = 'walkin' AND DATE(appointment_date) = CURDATE()`
        );
        const sequence = Number(tokenRows[0]?.total || 0) + 1;
        const walkinToken = `W-${String(sequence).padStart(3, '0')}`;

        const [insertResult] = await pool.query(
            `INSERT INTO appointments 
             (patient_id, doctor_id, appointment_date, status, appointment_type, walkin_token, walkin_priority)
             VALUES (?, NULL, NOW(), 'pending', 'walkin', ?, ?)`,
            [patient_id, walkinToken, safePriority]
        );

        const appointmentId = insertResult.insertId;

        const [trackingRows] = await pool.query(
            'SELECT id FROM patient_flow_tracking WHERE patient_id = ? AND check_out_time IS NULL ORDER BY id DESC LIMIT 1',
            [patient_id]
        );
        if (trackingRows.length > 0) {
            await pool.query(
                `UPDATE patient_flow_tracking 
                 SET status = 'waiting', appointment_id = ?, notes = CONCAT(IFNULL(notes, ''), ?)
                 WHERE id = ?`,
                [appointmentId, `\nWalk-in token: ${walkinToken}${notes ? ` | ${notes}` : ''}`, trackingRows[0].id]
            );
        } else {
            await pool.query(
                `INSERT INTO patient_flow_tracking (patient_id, status, appointment_id, notes)
                 VALUES (?, 'waiting', ?, ?)`,
                [patient_id, appointmentId, `Walk-in token: ${walkinToken}${notes ? ` | ${notes}` : ''}`]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Walk-in consultation token created',
            data: {
                appointment_id: appointmentId,
                walkin_token: walkinToken,
                walkin_priority: safePriority
            }
        });
    } catch (err) {
        console.error('createWalkinAppointment error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllAppointments = async (req, res) => {
    try {
        const [appointments] = await pool.query(`
      SELECT a.*, p_u.name as patient_name, d_u.name as doctor_name, dep.name as department_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users p_u ON p.user_id = p_u.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN users d_u ON d.user_id = d_u.id
      LEFT JOIN departments dep ON d.department_id = dep.id
    `);
        res.json({ success: true, appointments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateAppointmentStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true, message: 'Appointment status updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.claimWalkinAppointment = async (req, res) => {
    const { id } = req.params;
    const doctorUserId = req.user.id;
    try {
        const [doctors] = await pool.query('SELECT id FROM doctors WHERE user_id = ?', [doctorUserId]);
        if (doctors.length === 0) {
            return res.status(404).json({ success: false, message: 'Doctor record not found' });
        }
        const doctorId = doctors[0].id;

        const [appointments] = await pool.query(
            `SELECT * FROM appointments
             WHERE id = ? AND appointment_type = 'walkin' AND status = 'pending'`,
            [id]
        );
        if (appointments.length === 0) {
            return res.status(404).json({ success: false, message: 'Pending walk-in not found' });
        }

        await pool.query(
            'UPDATE appointments SET doctor_id = ?, status = ? WHERE id = ?',
            [doctorId, 'approved', id]
        );

        await pool.query(
            `UPDATE patient_flow_tracking
             SET doctor_id = ?, status = 'in_consultation'
             WHERE patient_id = ? AND check_out_time IS NULL`,
            [doctorId, appointments[0].patient_id]
        );

        res.json({ success: true, message: 'Walk-in claimed successfully' });
    } catch (err) {
        console.error('claimWalkinAppointment error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPatientAppointments = async (req, res) => {
    try {
        const [appointments] = await pool.query(`
      SELECT a.*, d_u.name as doctor_name
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users d_u ON d.user_id = d_u.id
      WHERE a.patient_id = (SELECT id FROM patients WHERE user_id = ?)
    `, [req.user.id]);
        res.json({ success: true, appointments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getDoctorAppointments = async (req, res) => {
    try {
        console.log('getDoctorAppointments called for user:', req.user.id);
        const [doctorData] = await pool.query('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
        console.log('Doctor data:', doctorData);

        if (doctorData.length === 0) {
            console.log('No doctor record found for user:', req.user.id);
            return res.status(404).json({ success: false, message: 'Doctor record not found' });
        }

        const doctorId = doctorData[0].id;
        console.log('Fetching appointments for doctor_id:', doctorId);

        const [appointments] = await pool.query(`
            SELECT a.*, p_u.name as patient_name, p.age, p.gender, p.blood_group, p.patient_type,
                   a.pending_lab_test_ids,
                   pft.status as flow_status,
                   GREATEST(TIMESTAMPDIFF(MINUTE, a.appointment_date, NOW()), 0) as waited_minutes,
                   CASE
                       WHEN EXISTS (
                           SELECT 1
                           FROM lab_tests lt
                           WHERE lt.patient_id = a.patient_id
                             AND lt.status = 'lab_done'
                             AND lt.completed_date IS NOT NULL
                       ) THEN 1
                       ELSE 0
                   END as has_lab_done
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users p_u ON p.user_id = p_u.id
            LEFT JOIN patient_flow_tracking pft ON pft.patient_id = a.patient_id AND pft.check_out_time IS NULL
            WHERE a.doctor_id = ?
               OR (a.appointment_type = 'walkin' AND a.doctor_id IS NULL AND a.status = 'pending')
            ORDER BY a.appointment_date ASC
        `, [doctorId]);

        const scoredAppointments = appointments.map((appt) => {
            const reasons = [];
            let score = 0;

            if (appt.flow_status === 'emergency') {
                score += 100;
                reasons.push('Emergency');
            }
            if (appt.appointment_type === 'walkin') {
                score += 15;
                reasons.push(`Walk-in ${appt.walkin_token || ''}`.trim());
            }
            if (appt.walkin_priority === 'emergency') {
                score += 90;
                reasons.push('Walk-in emergency');
            } else if (appt.walkin_priority === 'urgent') {
                score += 45;
                reasons.push('Walk-in urgent');
            }
            if (Number(appt.age || 0) >= 60) {
                score += 20;
                reasons.push('Senior priority');
            }

            const pendingLabRaw = appt.pending_lab_test_ids;
            const hasPendingLab =
                Array.isArray(pendingLabRaw)
                    ? pendingLabRaw.length > 0
                    : (typeof pendingLabRaw === 'string' && pendingLabRaw.trim() && pendingLabRaw.trim() !== '[]');
            if (hasPendingLab && Number(appt.has_lab_done) === 1) {
                score += 35;
                reasons.push('Return with lab report');
            }

            const waited = Number(appt.waited_minutes || 0);
            if (waited > 0) {
                const waitBoost = Math.min(30, Math.floor(waited / 10));
                score += waitBoost;
                if (waitBoost > 0) reasons.push(`Waiting ${waited} min`);
            }

            return {
                ...appt,
                queue_priority_score: score,
                queue_priority_reason: reasons.length > 0 ? reasons.join(' | ') : 'Standard queue'
            };
        });

        scoredAppointments.sort((a, b) => {
            const scoreDelta = Number(b.queue_priority_score || 0) - Number(a.queue_priority_score || 0);
            if (scoreDelta !== 0) return scoreDelta;
            return new Date(a.appointment_date) - new Date(b.appointment_date);
        });

        console.log('Found appointments:', scoredAppointments.length);
        res.json({ success: true, appointments: scoredAppointments });
    } catch (err) {
        console.error('Error in getDoctorAppointments:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getDoctorPatients = async (req, res) => {
    try {
        const [doctorData] = await pool.query('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (doctorData.length === 0) {
            return res.status(404).json({ success: false, message: 'Doctor record not found' });
        }

        const doctorId = doctorData[0].id;

        let whereClause = 'WHERE a.id IS NOT NULL';
        let params = [doctorId];

        if (req.query.search) {
            whereClause += ' AND p_u.name LIKE ?';
            params.push(`%${req.query.search}%`);
        }

        const [patients] = await pool.query(`
            SELECT DISTINCT p.*, p_u.name, p_u.email,
                   COUNT(DISTINCT a.id) as total_appointments,
                   SUM(CASE WHEN a.status IN ('approved', 'completed') THEN 1 ELSE 0 END) as completed_appointments
            FROM patients p
            LEFT JOIN users p_u ON p.user_id = p_u.id
            LEFT JOIN appointments a ON p.id = a.patient_id AND a.doctor_id = ?
            ${whereClause}
            GROUP BY p.id
            ORDER BY MAX(a.appointment_date) DESC
        `, params);

        res.json({ success: true, patients });
    } catch (err) {
        console.error('Error in getDoctorPatients:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
