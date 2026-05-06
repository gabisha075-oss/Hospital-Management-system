const pool = require('../config/db');

// Get all wards
exports.getAllWards = async (req, res) => {
    try {
        const [wards] = await pool.query(`
            SELECT w.*, COUNT(b.id) as total_beds,
                   SUM(CASE WHEN b.status = 'available' THEN 1 ELSE 0 END) as available_beds
            FROM wards w
            LEFT JOIN beds b ON w.id = b.ward_id
            GROUP BY w.id
            ORDER BY w.name
        `);
        res.json({ success: true, wards });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Add new ward
exports.addWard = async (req, res) => {
    const { name, description, total_beds } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO wards (name, description, total_beds, available_beds) VALUES (?, ?, ?, ?)',
            [name, description, total_beds, total_beds]
        );

        // Create beds for this ward
        const bedInserts = [];
        for (let i = 1; i <= total_beds; i++) {
            bedInserts.push([result.insertId, `B${i}`, `R${Math.ceil(i/4)}`, 'general', 500]);
        }

        if (bedInserts.length > 0) {
            await pool.query(
                'INSERT INTO beds (ward_id, bed_number, room_number, bed_type, price_per_day) VALUES ?',
                [bedInserts]
            );
        }

        res.status(201).json({ success: true, message: 'Ward and beds created successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get beds by ward
exports.getBedsByWard = async (req, res) => {
    const { ward_id } = req.params;
    try {
        const [beds] = await pool.query(`
            SELECT b.*, w.name as ward_name,
                   CASE WHEN ba.id IS NOT NULL THEN 'occupied' ELSE b.status END as current_status,
                   p.name as patient_name
            FROM beds b
            JOIN wards w ON b.ward_id = w.id
            LEFT JOIN bed_assignments ba ON b.id = ba.bed_id AND ba.status = 'active'
            LEFT JOIN patients pt ON ba.patient_id = pt.id
            LEFT JOIN users p ON pt.user_id = p.id
            WHERE b.ward_id = ?
            ORDER BY b.room_number, b.bed_number
        `, [ward_id]);

        res.json({ success: true, beds });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Add new bed to ward
exports.addBed = async (req, res) => {
    const { ward_id } = req.params;
    const { bed_number, room_number, bed_type, price_per_day } = req.body;

    try {
        // Check if ward exists
        const [wards] = await pool.query('SELECT * FROM wards WHERE id = ?', [ward_id]);
        if (wards.length === 0) {
            return res.status(404).json({ success: false, message: 'Ward not found' });
        }

        await pool.query(
            'INSERT INTO beds (ward_id, bed_number, room_number, bed_type, price_per_day, status) VALUES (?, ?, ?, ?, ?, ?)',
            [ward_id, bed_number, room_number, bed_type, price_per_day, 'available']
        );

        // Update ward's available beds count
        await pool.query(
            'UPDATE wards SET available_beds = available_beds + 1, total_beds = total_beds + 1 WHERE id = ?',
            [ward_id]
        );

        res.status(201).json({ success: true, message: 'Bed added successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get available beds
exports.getAvailableBeds = async (req, res) => {
    try {
        const [beds] = await pool.query(`
            SELECT b.*, w.name as ward_name
            FROM beds b
            JOIN wards w ON b.ward_id = w.id
            WHERE b.status = 'available'
            ORDER BY w.name, b.room_number, b.bed_number
        `);

        res.json({ success: true, beds });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Reserve bed for patient
exports.reserveBed = async (req, res) => {
    const { bed_id, patient_id, notes } = req.body;
    const assigned_by_user_id = req.user.id;

    try {
        // Check if bed is available
        const [beds] = await pool.query('SELECT * FROM beds WHERE id = ? AND status = ?', [bed_id, 'available']);
        if (beds.length === 0) {
            return res.status(400).json({ success: false, message: 'Bed is not available' });
        }

        // Check if patient already has an active bed assignment
        const [existingAssignments] = await pool.query(
            'SELECT * FROM bed_assignments WHERE patient_id = ? AND status = ?',
            [patient_id, 'active']
        );
        if (existingAssignments.length > 0) {
            return res.status(400).json({ success: false, message: 'Patient already has an active bed assignment' });
        }

        // Create bed assignment
        await pool.query(
            'INSERT INTO bed_assignments (patient_id, bed_id, assigned_by_user_id, notes) VALUES (?, ?, ?, ?)',
            [patient_id, bed_id, assigned_by_user_id, notes]
        );

        // Update bed status
        await pool.query('UPDATE beds SET status = ? WHERE id = ?', ['occupied', bed_id]);

        // Update ward available beds count
        await pool.query('UPDATE wards SET available_beds = available_beds - 1 WHERE id = ?', [beds[0].ward_id]);

        // Update patient type to inpatient
        await pool.query('UPDATE patients SET patient_type = ?, admitted_date = NOW() WHERE id = ?',
            ['inpatient', patient_id]);

        res.json({ success: true, message: 'Bed reserved successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Discharge patient from bed
exports.dischargePatient = async (req, res) => {
    const { bed_id } = req.params;
    const { notes } = req.body;

    try {
        // Get active bed assignment for this bed
        const [assignments] = await pool.query(
            'SELECT ba.*, b.ward_id FROM bed_assignments ba JOIN beds b ON ba.bed_id = b.id WHERE ba.bed_id = ? AND ba.status = ?',
            [bed_id, 'active']
        );

        if (assignments.length === 0) {
            return res.status(404).json({ success: false, message: 'No active bed assignments found' });
        }

        const assignment = assignments[0];

        // Calculate total cost (days * price_per_day)
        const assignedDate = new Date(assignment.assigned_date);
        const dischargeDate = new Date();
        const days = Math.ceil((dischargeDate - assignedDate) / (1000 * 60 * 60 * 24));
        const [bedInfo] = await pool.query('SELECT price_per_day FROM beds WHERE id = ?', [bed_id]);
        const totalCost = days * bedInfo[0].price_per_day;

        // Update bed assignment
        await pool.query(
            'UPDATE bed_assignments SET status = ?, discharge_date = NOW(), notes = CONCAT(IFNULL(notes, ""), ?), total_cost = ? WHERE id = ?',
            ['discharged', notes ? '\n' + notes : '', totalCost, assignment.id]
        );

        // Update bed status to available
        await pool.query('UPDATE beds SET status = ? WHERE id = ?', ['available', bed_id]);

        // Update ward available beds count
        await pool.query('UPDATE wards SET available_beds = available_beds + 1 WHERE id = ?', [assignment.ward_id]);

        // Update patient type to outpatient and set discharge date
        await pool.query('UPDATE patients SET patient_type = ?, discharged_date = NOW() WHERE id = ?',
            ['outpatient', assignment.patient_id]);

        res.json({
            success: true,
            message: 'Patient discharged successfully',
            data: { total_cost: totalCost, days_stayed: days }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get bed assignments for a patient
exports.getPatientBedHistory = async (req, res) => {
    const { patient_id } = req.params;
    try {
        const [history] = await pool.query(`
            SELECT ba.*, b.bed_number, b.room_number, w.name as ward_name,
                   u.name as assigned_by_name, b.price_per_day
            FROM bed_assignments ba
            JOIN beds b ON ba.bed_id = b.id
            JOIN wards w ON b.ward_id = w.id
            JOIN users u ON ba.assigned_by_user_id = u.id
            WHERE ba.patient_id = ?
            ORDER BY ba.assigned_date DESC
        `, [patient_id]);

        res.json({ success: true, bedHistory: history });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get current bed occupancy
exports.getBedOccupancy = async (req, res) => {
    try {
        const [occupancy] = await pool.query(`
            SELECT w.name as ward_name, w.total_beds, w.available_beds,
                   (w.total_beds - w.available_beds) as occupied_beds,
                   ROUND(((w.total_beds - w.available_beds) / w.total_beds) * 100, 2) as occupancy_rate
            FROM wards w
            ORDER BY w.name
        `);

        const [totalStats] = await pool.query(`
            SELECT SUM(total_beds) as total_beds,
                   SUM(available_beds) as available_beds,
                   SUM(total_beds - available_beds) as occupied_beds
            FROM wards
        `);

        res.json({
            success: true,
            occupancy: occupancy,
            totalStats: totalStats[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Transfer patient to different bed
exports.transferPatient = async (req, res) => {
    const { patient_id, new_bed_id, notes } = req.body;
    const transferred_by_user_id = req.user.id;

    try {
        // Get current active assignment
        const [currentAssignments] = await pool.query(
            'SELECT * FROM bed_assignments WHERE patient_id = ? AND status = ?',
            [patient_id, 'active']
        );

        if (currentAssignments.length === 0) {
            return res.status(404).json({ success: false, message: 'No active bed assignment found' });
        }

        const currentAssignment = currentAssignments[0];

        // Check if new bed is available
        const [newBeds] = await pool.query('SELECT * FROM beds WHERE id = ? AND status = ?', [new_bed_id, 'available']);
        if (newBeds.length === 0) {
            return res.status(400).json({ success: false, message: 'New bed is not available' });
        }

        // Discharge from current bed
        await pool.query(
            'UPDATE bed_assignments SET status = ?, discharge_date = NOW(), notes = CONCAT(IFNULL(notes, ""), ?) WHERE id = ?',
            ['transferred', notes ? '\nTransferred to new bed: ' + notes : '\nTransferred to new bed', currentAssignment.id]
        );

        // Update old bed to available
        await pool.query('UPDATE beds SET status = ? WHERE id = ?', ['available', currentAssignment.bed_id]);

        // Update old ward available beds
        const [oldBed] = await pool.query('SELECT ward_id FROM beds WHERE id = ?', [currentAssignment.bed_id]);
        await pool.query('UPDATE wards SET available_beds = available_beds + 1 WHERE id = ?', [oldBed[0].ward_id]);

        // Assign to new bed
        await pool.query(
            'INSERT INTO bed_assignments (patient_id, bed_id, assigned_by_user_id, notes) VALUES (?, ?, ?, ?)',
            [patient_id, new_bed_id, transferred_by_user_id, 'Transferred from bed ' + currentAssignment.bed_id]
        );

        // Update new bed to occupied
        await pool.query('UPDATE beds SET status = ? WHERE id = ?', ['occupied', new_bed_id]);

        // Update new ward available beds
        const [newBed] = await pool.query('SELECT ward_id FROM beds WHERE id = ?', [new_bed_id]);
        await pool.query('UPDATE wards SET available_beds = available_beds - 1 WHERE id = ?', [newBed[0].ward_id]);

        res.json({ success: true, message: 'Patient transferred successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get bed statistics
exports.getBedStats = async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT
                COUNT(*) as total_beds,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_beds,
                SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_beds,
                SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_beds,
                ROUND((SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as occupancy_rate
            FROM beds
        `);

        const [wardStats] = await pool.query(`
            SELECT w.name, w.total_beds, w.available_beds,
                   (w.total_beds - w.available_beds) as occupied_beds,
                   ROUND(((w.total_beds - w.available_beds) / w.total_beds) * 100, 2) as occupancy_rate
            FROM wards w
            ORDER BY w.name
        `);

        const [monthlyRevenue] = await pool.query(`
            SELECT DATE_FORMAT(ba.admission_date, '%Y-%m') as month,
                   SUM(DATEDIFF(IFNULL(ba.discharge_date, NOW()), ba.admission_date) * b.price_per_day) as revenue
            FROM bed_assignments ba
            JOIN beds b ON ba.bed_id = b.id
            WHERE ba.admission_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY month
            ORDER BY month DESC
        `);

        res.json({
            success: true,
            overall_stats: stats[0],
            ward_stats: wardStats,
            monthly_revenue: monthlyRevenue
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteWard = async (req, res) => {
    const { wardId } = req.params;
    try {
        // Check for active (occupied) beds
        const [activeAssignments] = await pool.query(`
            SELECT COUNT(*) as active_count 
            FROM bed_assignments ba 
            JOIN beds b ON ba.bed_id = b.id 
            WHERE b.ward_id = ? AND ba.status = 'active'
        `, [wardId]);

        if (activeAssignments[0].active_count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete ward with occupied beds. Please discharge all patients first.' 
            });
        }

        const [result] = await pool.query('DELETE FROM wards WHERE id = ?', [wardId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Ward not found' });
        }

        res.json({ success: true, message: 'Ward deleted successfully (beds cascaded)' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
