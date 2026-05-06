const pool = require('../config/db');
const DEFAULT_DAILY_ROOM_RATE = Number(process.env.INPATIENT_ROOM_DAILY_RATE || 1000);

const appendInpatientRoomChargeToBill = async (connection, patientId, stayDays, dailyRate) => {
    const totalCharge = Number((stayDays * dailyRate).toFixed(2));
    const [existingBills] = await connection.query(
        'SELECT * FROM bills WHERE patient_id = ? AND status IN ("unpaid", "partial") ORDER BY created_at DESC LIMIT 1',
        [patientId]
    );

    let billId;
    if (existingBills.length > 0) {
        const bill = existingBills[0];
        billId = bill.id;
        const currentTotal = Number(bill.total_amount || 0);
        const currentPaid = Number(bill.paid_amount || 0);
        const newTotal = Number((currentTotal + totalCharge).toFixed(2));
        const newStatus = currentPaid >= newTotal ? 'paid' : (currentPaid > 0 ? 'partial' : 'unpaid');

        await connection.query(
            'UPDATE bills SET total_amount = ?, status = ? WHERE id = ?',
            [newTotal, newStatus, billId]
        );
    } else {
        const [newBill] = await connection.query(
            'INSERT INTO bills (patient_id, total_amount, paid_amount, status) VALUES (?, ?, 0, "unpaid")',
            [patientId, totalCharge]
        );
        billId = newBill.insertId;
    }

    await connection.query(
        'INSERT INTO bill_items (bill_id, description, amount) VALUES (?, ?, ?)',
        [billId, `Inpatient room stay (${stayDays} day(s) @ ${dailyRate.toFixed(2)}/day)`, totalCharge]
    );

    return { billId, totalCharge };
};

exports.getAllPatients = async (req, res) => {
    try {
        const [patients] = await pool.query(`
      SELECT p.*, u.name, u.email 
      FROM patients p
      JOIN users u ON p.user_id = u.id
    `);
        res.json({ success: true, patients });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPatientById = async (req, res) => {
    try {
        const [patient] = await pool.query(`
      SELECT p.*, u.name, u.email 
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [req.params.id]);
        res.json({ success: true, patient: patient[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updatePatient = async (req, res) => {
    const { id } = req.params;
    const { name, age, gender, blood_group, phone, address, patient_type } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update User Name
        if (name) {
            const [patient] = await connection.query('SELECT user_id FROM patients WHERE id = ?', [id]);
            if (patient.length > 0) {
                await connection.query('UPDATE users SET name = ? WHERE id = ?', [name, patient[0].user_id]);
            }
        }

        // 2. Update Patient Meta
        await connection.query(
            'UPDATE patients SET age = ?, gender = ?, blood_group = ?, phone = ?, address = ?, patient_type = ? WHERE id = ?',
            [age, gender, blood_group, phone, address, patient_type, id]
        );

        await connection.commit();
        res.json({ success: true, message: 'Patient profile and user name updated' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

exports.getPatientProfile = async (req, res) => {
    try {
        const [patient] = await pool.query(`
      SELECT p.*, u.name, u.email, u.role
      FROM patients p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
    `, [req.user.id]);

        if (patient.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient profile not found. Ensure patient record exists for your user account.' });
        }

        res.json({ success: true, patient: patient[0] });
    } catch (err) {
        console.error('getPatientProfile error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Convert outpatient to inpatient (admit patient)
exports.admitPatient = async (req, res) => {
    const { patient_id } = req.body;
    const admitted_by = req.user.id;

    try {
        // Check if patient exists
        const [patient] = await pool.query('SELECT * FROM patients WHERE id = ?', [patient_id]);
        if (patient.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        // Update patient type to inpatient
        await pool.query(
            'UPDATE patients SET patient_type = ?, admitted_date = NOW(), admitted_by = ? WHERE id = ?',
            ['inpatient', admitted_by, patient_id]
        );

        // Update patient flow status to admitted
        await pool.query(`
            UPDATE patient_flow_tracking
            SET status = 'admitted'
            WHERE patient_id = ? AND check_out_time IS NULL
        `, [patient_id]);

        res.json({ success: true, message: 'Patient admitted as inpatient successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Convert inpatient to outpatient (discharge patient)
exports.dischargePatient = async (req, res) => {
    const { patient_id } = req.body;
    const discharged_by = req.user.id;

    try {
        // Check if patient exists and is inpatient
        const [patient] = await pool.query('SELECT * FROM patients WHERE id = ? AND patient_type = ?', [patient_id, 'inpatient']);
        if (patient.length === 0) {
            return res.status(404).json({ success: false, message: 'Inpatient not found' });
        }

        // Update patient type to outpatient
        await pool.query(
            'UPDATE patients SET patient_type = ?, discharged_date = NOW(), discharged_by = ? WHERE id = ?',
            ['outpatient', discharged_by, patient_id]
        );

        // Update patient flow status to discharged
        await pool.query(`
            UPDATE patient_flow_tracking
            SET status = 'discharged'
            WHERE patient_id = ? AND check_out_time IS NULL
        `, [patient_id]);

        res.json({ success: true, message: 'Patient discharged successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get inpatient statistics
exports.getInpatientStats = async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT
                COUNT(*) as total_inpatients,
                SUM(CASE WHEN admitted_date IS NOT NULL AND admitted_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as admitted_today,
                SUM(CASE WHEN discharged_date IS NOT NULL AND discharged_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as discharged_today,
                AVG(DATEDIFF(NOW(), COALESCE(admitted_date, NOW()))) as avg_stay_days
            FROM patients
            WHERE patient_type = 'inpatient'
        `);

        res.json({ success: true, stats: stats[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all inpatients
exports.getInpatients = async (req, res) => {
    try {
        const [patients] = await pool.query(`
            SELECT p.*, u.name as patient_name, u.email, w.name as ward_name, b.bed_number, ba.id as assignment_id,
                   GREATEST(DATEDIFF(CURDATE(), DATE(COALESCE(p.admitted_date, NOW()))) + 1, 1) as days_admitted,
                   ar_latest.stay_days as planned_stay_days
            FROM patients p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN bed_assignments ba ON p.id = ba.patient_id AND ba.status = 'active'
            LEFT JOIN beds b ON ba.bed_id = b.id
            LEFT JOIN wards w ON b.ward_id = w.id
            LEFT JOIN (
                SELECT ar.patient_id, ar.stay_days
                FROM admission_requests ar
                INNER JOIN (
                    SELECT patient_id, MAX(processed_at) as latest_processed_at
                    FROM admission_requests
                    WHERE status = 'approved'
                    GROUP BY patient_id
                ) x ON x.patient_id = ar.patient_id AND x.latest_processed_at = ar.processed_at
                WHERE ar.status = 'approved'
            ) ar_latest ON ar_latest.patient_id = p.id
            WHERE p.patient_type = 'inpatient'
            ORDER BY p.admitted_date DESC
        `);
        res.json({ success: true, patients });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPendingAdmissionRequests = async (req, res) => {
    try {
        const [requests] = await pool.query(`
            SELECT ar.*, pu.name as patient_name, pu.email as patient_email, du.name as doctor_name
            FROM admission_requests ar
            JOIN patients p ON ar.patient_id = p.id
            JOIN users pu ON p.user_id = pu.id
            JOIN doctors d ON ar.doctor_id = d.id
            JOIN users du ON d.user_id = du.id
            WHERE ar.status = 'pending'
            ORDER BY ar.requested_at DESC
        `);

        res.json({ success: true, requests });
    } catch (err) {
        console.error('getPendingAdmissionRequests error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.processAdmissionRequest = async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
        const [requests] = await connection.query(
            'SELECT * FROM admission_requests WHERE id = ? AND status = "pending"',
            [id]
        );

        if (requests.length === 0) {
            return res.status(404).json({ success: false, message: 'Pending admission request not found' });
        }

        const request = requests[0];
        const requestedBedId = Number(req.body.bed_id);
        const stayDays = Number(req.body.stay_days || request.stay_days);
        const notes = req.body.notes || request.notes || null;

        if (!Number.isInteger(stayDays) || stayDays <= 0) {
            return res.status(400).json({ success: false, message: 'Stay days must be a positive integer' });
        }

        await connection.beginTransaction();

        let beds;
        if (Number.isInteger(requestedBedId) && requestedBedId > 0) {
            [beds] = await connection.query(
                'SELECT id, ward_id, bed_number, room_number, status, price_per_day FROM beds WHERE id = ? FOR UPDATE',
                [requestedBedId]
            );
        } else {
            [beds] = await connection.query(
                `SELECT id, ward_id, bed_number, room_number, status, price_per_day
                 FROM beds
                 WHERE status = "available"
                 ORDER BY ward_id ASC, room_number ASC, bed_number ASC
                 LIMIT 1
                 FOR UPDATE`
            );
        }

        if (beds.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'No available bed found for admission' });
        }
        if (beds[0].status !== 'available') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Selected bed is not available' });
        }
        const bedId = beds[0].id;

        const requestRate = Number(req.body.daily_room_rate);
        const bedRate = Number(beds[0].price_per_day);
        const dailyRate = Number.isFinite(requestRate) && requestRate > 0
            ? requestRate
            : (Number.isFinite(bedRate) && bedRate > 0
                ? bedRate
                : Number(request.daily_room_rate || DEFAULT_DAILY_ROOM_RATE));
        if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Daily room rate could not be resolved from bed configuration' });
        }

        const [existingAssignments] = await connection.query(
            'SELECT id FROM bed_assignments WHERE patient_id = ? AND status = "active"',
            [request.patient_id]
        );
        if (existingAssignments.length > 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Patient already has an active bed assignment' });
        }

        await connection.query(
            'INSERT INTO bed_assignments (patient_id, bed_id, assigned_by_user_id, notes, status) VALUES (?, ?, ?, ?, "active")',
            [request.patient_id, bedId, req.user.id, notes]
        );
        await connection.query('UPDATE beds SET status = "occupied" WHERE id = ?', [bedId]);
        await connection.query('UPDATE wards SET available_beds = available_beds - 1 WHERE id = ?', [beds[0].ward_id]);

        await connection.query(
            'UPDATE patients SET patient_type = ?, admitted_date = NOW(), admitted_by = ? WHERE id = ?',
            ['inpatient', req.user.id, request.patient_id]
        );

        await connection.query(`
            UPDATE patient_flow_tracking
            SET status = 'admitted'
            WHERE patient_id = ? AND check_out_time IS NULL
        `, [request.patient_id]);

        await connection.query(
            `UPDATE admission_requests
             SET status = 'approved', processed_at = NOW(), processed_by_user_id = ?, stay_days = ?, daily_room_rate = ?, notes = ?
             WHERE id = ?`,
            [req.user.id, stayDays, dailyRate, notes, id]
        );

        const billingResult = await appendInpatientRoomChargeToBill(connection, request.patient_id, stayDays, dailyRate);

        await connection.commit();
        res.json({
            success: true,
            message: 'Patient converted to inpatient, bed allocated, and room charges billed',
            data: {
                patient_id: request.patient_id,
                bed_id: bedId,
                bed_auto_allocated: !(Number.isInteger(requestedBedId) && requestedBedId > 0),
                bed_number: beds[0].bed_number,
                room_number: beds[0].room_number,
                stay_days: stayDays,
                daily_room_rate: dailyRate,
                room_stay_charge: billingResult.totalCharge,
                bill_id: billingResult.billId
            }
        });
    } catch (err) {
        await connection.rollback();
        console.error('processAdmissionRequest error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

// Get patient consultation history with complete details
exports.getConsultationHistory = async (req, res) => {
    const { id } = req.params;
    try {
        const [consultations] = await pool.query(`
            SELECT 
                a.id,
                a.appointment_date as consultation_date,
                a.consultation_fee,
                a.status,
                u.name as doctor_name,
                d.specialization,
                GROUP_CONCAT(DISTINCT m.name SEPARATOR ', ') as medicine_names,
                GROUP_CONCAT(DISTINCT CONCAT(p.dosage) SEPARATOR '; ') as dosages,
                GROUP_CONCAT(DISTINCT p.instructions SEPARATOR '; ') as instructions,
                COUNT(DISTINCT lt.id) as lab_tests_count,
                GROUP_CONCAT(DISTINCT lt.test_name SEPARATOR ', ') as lab_tests
            FROM appointments a
            LEFT JOIN doctors d ON a.doctor_id = d.id
            LEFT JOIN users u ON d.user_id = u.id
            LEFT JOIN prescriptions p ON a.patient_id = p.patient_id 
                AND p.created_at >= DATE_SUB(a.appointment_date, INTERVAL 1 DAY)
                AND p.created_at <= DATE_ADD(a.appointment_date, INTERVAL 1 DAY)
            LEFT JOIN medicines m ON p.medicine_id = m.id
            LEFT JOIN lab_tests lt ON a.patient_id = lt.patient_id 
                AND lt.requested_date >= DATE_SUB(a.appointment_date, INTERVAL 1 DAY)
                AND lt.requested_date <= DATE_ADD(a.appointment_date, INTERVAL 1 DAY)
            WHERE a.patient_id = ? AND a.status IN ('completed', 'approved')
            GROUP BY a.id
            ORDER BY a.appointment_date DESC
        `, [id]);

        res.json({ 
            success: true, 
            consultations: consultations || []
        });
    } catch (err) {
        console.error('Error fetching consultation history:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deletePatient = async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Get user_id first
        const [patient] = await connection.query('SELECT user_id FROM patients WHERE id = ?', [id]);
        if (patient.length === 0) {
            return connection.rollback();
            res.status(404).json({ success: false, message: 'Patient not found' });
        }
        const userId = patient[0].user_id;

        // Delete related records first (appointments, bills, etc. - assuming cascade or manual)
        await connection.query('DELETE FROM appointments WHERE patient_id = ?', [id]);
        await connection.query('DELETE FROM lab_tests WHERE patient_id = ?', [id]);
        await connection.query('DELETE FROM bills WHERE patient_id = ?', [id]);
        await connection.query('DELETE FROM patient_flow_tracking WHERE patient_id = ?', [id]);
        await connection.query('DELETE FROM bed_assignments WHERE patient_id = ?', [id]);

        // Delete patient
        await connection.query('DELETE FROM patients WHERE id = ?', [id]);
        // Delete user
        await connection.query('DELETE FROM users WHERE id = ?', [userId]);

        await connection.commit();
        res.json({ success: true, message: 'Patient and associated records deleted successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Delete patient error:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        connection.release();
    }
};

