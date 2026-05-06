const pool = require('../config/db');

// Check-in patient to a department
exports.checkInPatient = async (req, res) => {
    const { patient_id, department_id } = req.body;
    try {
        // Verify patient exists
        const [patients] = await pool.query('SELECT * FROM patients WHERE id = ?', [patient_id]);
        if (patients.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        // Create flow tracking record
        await pool.query(`
            INSERT INTO patient_flow_tracking (patient_id, department_id, status)
            VALUES (?, ?, 'checked_in')
        `, [patient_id, department_id]);

        res.status(201).json({ success: true, message: 'Patient checked in successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update patient status in flow
exports.updatePatientStatus = async (req, res) => {
    const { patient_id, status: rawStatus } = req.body;
    
    // Robust validation and normalization
    if (!rawStatus || typeof rawStatus !== 'string') {
        console.warn(`Invalid status type for patient ${patient_id}:`, typeof rawStatus, rawStatus);
        return res.status(400).json({ success: false, message: 'Status is required and must be a string' });
    }
    
    const normalizedStatus = rawStatus.trim().toLowerCase().replace(/[^a-z_]/g, '');
    const validStatuses = ['checked_in', 'waiting', 'emergency', 'in_consultation', 'lab_test', 'admitted', 'discharged', 'pharmacy', 'billing', 'checked_out'];
    
    if (!validStatuses.includes(normalizedStatus)) {
        console.warn(`Invalid status for patient ${patient_id}: "${rawStatus}" -> "${normalizedStatus}", valid:`, validStatuses);
        return res.status(400).json({ success: false, message: `Invalid status: ${rawStatus}. Must be one of: ${validStatuses.join(', ')}` });
    }

    try {
        // Get current flow record
        const [flows] = await pool.query(`
            SELECT status as current_status FROM patient_flow_tracking 
            WHERE patient_id = ? AND check_out_time IS NULL
            ORDER BY check_in_time DESC LIMIT 1
        `, [patient_id]);

        if (flows.length === 0) {
            return res.status(404).json({ success: false, message: 'No active flow record found' });
        }

        const oldStatus = flows[0].current_status;
        console.log(`Patient ${patient_id} status updated: ${oldStatus} -> ${normalizedStatus}`);

        // Update status
        await pool.query(`
            UPDATE patient_flow_tracking 
            SET status = ? 
            WHERE patient_id = ? AND check_out_time IS NULL
        `, [normalizedStatus, patient_id]);

        res.json({ success: true, message: `Patient status updated: ${oldStatus} → ${normalizedStatus}` });
    } catch (err) {
        console.error('Update patient status error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Check-out patient and calculate duration
exports.checkOutPatient = async (req, res) => {
    const { patient_id } = req.params;
    const { notes } = req.body;

    try {
        const [flows] = await pool.query(`
            SELECT * FROM patient_flow_tracking 
            WHERE patient_id = ? AND check_out_time IS NULL
            ORDER BY check_in_time DESC LIMIT 1
        `, [patient_id]);

        if (flows.length === 0) {
            return res.status(404).json({ success: false, message: 'No active flow record found' });
        }

        const duration = Math.round((new Date() - new Date(flows[0].check_in_time)) / 60000);

        await pool.query(`
            UPDATE patient_flow_tracking 
            SET status = 'checked_out', check_out_time = NOW(), 
                duration_minutes = ?, notes = ?
            WHERE id = ?
        `, [duration, notes || null, flows[0].id]);

        res.json({ 
            success: true, 
            message: 'Patient checked out successfully',
            data: {
                duration_minutes: duration
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get patient flow history
exports.getPatientFlowHistory = async (req, res) => {
    const { patient_id } = req.params;
    try {
        const [flowHistory] = await pool.query(`
            SELECT pf.*, d.name as department_name
            FROM patient_flow_tracking pf
            LEFT JOIN departments d ON pf.department_id = d.id
            WHERE pf.patient_id = ?
            ORDER BY pf.check_in_time DESC
        `, [patient_id]);

        res.json({ success: true, flowHistory });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get current patient location (active flow)
exports.getCurrentPatientLocation = async (req, res) => {
    const { patient_id } = req.params;
    try {
        const [flows] = await pool.query(`
            SELECT pf.*, d.name as department_name, u.name as patient_name
            FROM patient_flow_tracking pf
            LEFT JOIN departments d ON pf.department_id = d.id
            LEFT JOIN patients p ON pf.patient_id = p.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE pf.patient_id = ? AND pf.check_out_time IS NULL
            ORDER BY pf.check_in_time DESC LIMIT 1
        `, [patient_id]);

        if (flows.length === 0) {
            return res.json({ success: true, message: 'Patient not currently checked in', flow: null });
        }

        res.json({ success: true, flow: flows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all active patients in hospital
exports.getActivePatients = async (req, res) => {
    try {
        const [patients] = await pool.query(`
            SELECT DISTINCT pf.*, u.name as patient_name, d.name as department_name
            FROM patient_flow_tracking pf
            LEFT JOIN patients p ON pf.patient_id = p.id
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN departments d ON pf.department_id = d.id
            WHERE pf.check_out_time IS NULL
            ORDER BY pf.check_in_time ASC
        `);

        res.json({ success: true, activePatients: patients });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get patient medicine history for receptionist
exports.getPatientMedicineHistory = async (req, res) => {
    const { patient_id } = req.params;
    try {
        const [medicineHistory] = await pool.query(`
            SELECT pmh.*, m.name as medicine_name, m.price, u.name as issued_by_pharmacist
            FROM patient_medicine_history pmh
            JOIN medicines m ON pmh.medicine_id = m.id
            JOIN users u ON pmh.issued_by_user_id = u.id
            WHERE pmh.patient_id = ?
            ORDER BY pmh.issued_at DESC
        `, [patient_id]);

        // Calculate total medicine cost
        const totalCost = medicineHistory.reduce((sum, med) => sum + (med.price * med.quantity), 0);

        res.json({ 
            success: true, 
            medicineHistory,
            totalCost
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Dashboard stats for receptionist
exports.getFlowDashboardStats = async (req, res) => {
    try {
        const [totalActivePatients] = await pool.query(`
            SELECT COUNT(DISTINCT patient_id) as count
            FROM patient_flow_tracking
            WHERE check_out_time IS NULL
        `);

        const [patientsByStatus] = await pool.query(`
            SELECT status, COUNT(*) as count
            FROM patient_flow_tracking
            WHERE check_out_time IS NULL
            GROUP BY status
        `);

        const [avgServiceTime] = await pool.query(`
            SELECT AVG(duration_minutes) as avg_duration
            FROM patient_flow_tracking
            WHERE duration_minutes IS NOT NULL
        `);

        const [completedToday] = await pool.query(`
            SELECT COUNT(*) as count
            FROM patient_flow_tracking
            WHERE DATE(check_out_time) = CURDATE()
        `);

        res.json({ 
            success: true, 
            stats: {
                totalActivePatients: totalActivePatients[0].count,
                patientsByStatus,
                averageServiceTime: avgServiceTime[0].avg_duration,
                completedToday: completedToday[0].count
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
