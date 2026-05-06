const pool = require('../config/db');

// Get available lab test templates for doctors to prescribe
exports.getLabTestTemplates = async (req, res) => {
    try {
        const templates = [
            { id: 'blood', name: 'Blood Test', test_category: 'blood', cost: 200 },
            { id: 'urine', name: 'Urine Analysis', test_category: 'urine', cost: 150 },
            { id: 'xray', name: 'X-Ray', test_category: 'xray', cost: 500 },
            { id: 'mri', name: 'MRI Scan', test_category: 'mri', cost: 2000 },
            { id: 'ct_scan', name: 'CT Scan', test_category: 'ct_scan', cost: 1500 },
            { id: 'ecg', name: 'ECG Test', test_category: 'ecg', cost: 300 },
            { id: 'ultrasound', name: 'Ultrasound', test_category: 'ultrasound', cost: 800 },
            { id: 'biopsy', name: 'Biopsy', test_category: 'biopsy', cost: 1000 }
        ];
        res.json({ success: true, tests: templates });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create lab test request (Doctor)
exports.createLabTest = async (req, res) => {
    const { patient_id, test_name, test_category, priority, notes } = req.body;
    const doctor_user_id = req.user.id;

    try {
        // Get doctor_id from users table
        const [doctors] = await pool.query('SELECT id FROM doctors WHERE user_id = ?', [doctor_user_id]);
        if (doctors.length === 0) {
            return res.status(403).json({ success: false, message: 'Only registered doctors can request lab tests' });
        }
        const doctor_id = doctors[0].id;

        // Set default cost based on test category
        const costMap = {
            'blood': 200,
            'urine': 150,
            'xray': 500,
            'mri': 2000,
            'ct_scan': 1500,
            'ecg': 300,
            'ultrasound': 800,
            'biopsy': 1000,
            'other': 250
        };
        const cost = costMap[test_category] || 250;

        await pool.query(
            'INSERT INTO lab_tests (patient_id, doctor_id, test_name, test_category, priority, requested_by_user_id, notes, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [patient_id, doctor_id, test_name, test_category, priority, doctor_user_id, notes, cost]
        );

        // Update patient flow status to lab_test
        await pool.query(`
            UPDATE patient_flow_tracking
            SET status = 'lab_test'
            WHERE patient_id = ? AND check_out_time IS NULL
        `, [patient_id]);

        res.status(201).json({ success: true, message: 'Lab test requested successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all lab tests (Lab staff & Admin)
exports.getAllLabTests = async (req, res) => {
    try {
        const [tests] = await pool.query(`
SELECT lt.*, p.name as patient_name, 
                   u1.name as doctor_name, u2.name as lab_technician_name,
                   pt.patient_type, pt.age, pt.gender
            FROM lab_tests lt
            LEFT JOIN patients pt ON lt.patient_id = pt.id
            LEFT JOIN users p ON pt.user_id = p.id
            LEFT JOIN doctors doc ON lt.doctor_id = doc.id
            LEFT JOIN users d ON doc.user_id = d.id
            LEFT JOIN users u1 ON lt.requested_by_user_id = u1.id
            LEFT JOIN users u2 ON lt.assigned_to_user_id = u2.id
            ORDER BY
                CASE lt.priority
                    WHEN 'emergency' THEN 1
                    WHEN 'urgent' THEN 2
                    WHEN 'routine' THEN 3
                END,
                lt.requested_date ASC
        `);
        res.json({ success: true, tests });
    } catch (err) {
        console.error('Error in getAllLabTests:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get pending lab tests
exports.getPendingLabTests = async (req, res) => {
    try {
        const [tests] = await pool.query(`
SELECT lt.*, p.name as patient_name, 
                   u1.name as doctor_name, pt.patient_type
            FROM lab_tests lt
            LEFT JOIN patients pt ON lt.patient_id = pt.id
            LEFT JOIN users p ON pt.user_id = p.id
            LEFT JOIN doctors doc ON lt.doctor_id = doc.id
            LEFT JOIN users d ON doc.user_id = d.id
            LEFT JOIN users u1 ON lt.requested_by_user_id = u1.id
            WHERE lt.status IN ('requested', 'in_progress')
            ORDER BY
                CASE lt.priority
                    WHEN 'emergency' THEN 1
                    WHEN 'urgent' THEN 2
                    WHEN 'routine' THEN 3
                END,
                lt.requested_date ASC
        `);
        res.json({ success: true, tests });
    } catch (err) {
        console.error('Error in getPendingLabTests:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get lab tests for a patient
exports.getLabTestsByPatient = async (req, res) => {
    const { patient_id } = req.params;
    try {
        const [tests] = await pool.query(`
SELECT lt.*, 
                   u.name as doctor_name
            FROM lab_tests lt
            LEFT JOIN users u ON lt.requested_by_user_id = u.id
            WHERE lt.patient_id = ?
            ORDER BY lt.requested_date DESC
        `, [patient_id]);
        res.json({ success: true, tests });
    } catch (err) {
        console.error('Error in getLabTestsByPatient:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};


// Get completed lab tests for a patient (for patient dashboard)
exports.getCompletedLabTestsByPatient = async (req, res) => {
    const { patient_id } = req.params;
    try {
        console.log(`📊 Fetching completed lab tests for patient ${patient_id}`);
        
        // First get completed tests (fixed: specialization from doc table)
        const [tests] = await pool.query(`
SELECT lt.*, 
                   u.name as doctor_name
            FROM lab_tests lt
            LEFT JOIN users u ON lt.requested_by_user_id = u.id
            WHERE lt.patient_id = ? AND lt.status = 'lab_done'
            ORDER BY lt.completed_date DESC
        `, [patient_id]);

        // Add latest report to each test if available
        const testsWithReports = await Promise.all(tests.map(async (test) => {
            const [latestReport] = await pool.query(`
                SELECT file_path, created_at as report_date 
                FROM lab_reports 
                WHERE patient_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            `, [patient_id]);
            
            return {
                ...test,
                report_path: latestReport[0]?.file_path || null,
                report_date: latestReport[0]?.report_date || null
            };
        }));

        console.log(`✅ Found ${testsWithReports.length} completed tests with reports for patient ${patient_id}`);
        res.json({ success: true, tests: testsWithReports });
    } catch (err) {
        console.error('Error in getCompletedLabTestsByPatient:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};



// Assign lab test to technician
exports.assignLabTest = async (req, res) => {
    const { id } = req.params;
    const { assigned_to_user_id } = req.body;

    try {
        // Check if test exists and is not completed
        const [tests] = await pool.query('SELECT * FROM lab_tests WHERE id = ? AND status NOT IN (?, ?)', [id, 'lab_done', 'cancelled']);
        if (tests.length === 0) {
            return res.status(404).json({ success: false, message: 'Lab test not found or already completed/cancelled' });
        }

        await pool.query(
            'UPDATE lab_tests SET assigned_to_user_id = ?, status = ? WHERE id = ?',
            [assigned_to_user_id, 'in_progress', id]
        );

        res.json({ success: true, message: 'Lab test assigned successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update lab test results
exports.updateLabTestResults = async (req, res) => {
    const { id } = req.params;
    const { results, notes } = req.body;

    try {
        // Check if test exists and is in progress
        const [tests] = await pool.query('SELECT * FROM lab_tests WHERE id = ? AND status = ?', [id, 'in_progress']);
        if (tests.length === 0) {
            return res.status(404).json({ success: false, message: 'Lab test not found or not in progress' });
        }

        await pool.query(
            'UPDATE lab_tests SET results = ?, notes = ? WHERE id = ?',
            [results, notes, id]
        );

        // Keep patient flow in lab_test until technician marks complete
        res.json({ success: true, message: 'Lab test results updated, ready for completion' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Complete lab test explicitly (Lab technician clicks completed)
exports.completeLabTest = async (req, res) => {
    const { id } = req.params;
    try {
        const [tests] = await pool.query('SELECT * FROM lab_tests WHERE id = ? AND status = ?', [id, 'in_progress']);
        if (tests.length === 0) {
            return res.status(404).json({ success: false, message: 'Lab test not found or not in progress' });
        }

        const test = tests[0];

        await pool.query(
            'UPDATE lab_tests SET status = ?, completed_date = NOW() WHERE id = ?',
            ['lab_done', id]
        );

        // Set patient flow to in_consultation after lab is completed
        await pool.query(`
            UPDATE patient_flow_tracking
            SET status = 'in_consultation'
            WHERE patient_id = ? AND check_out_time IS NULL
        `, [test.patient_id]);

        res.json({ success: true, message: 'Lab test marked lab_done and patient flow updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Cancel lab test
exports.cancelLabTest = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    try {
        const [tests] = await pool.query('SELECT * FROM lab_tests WHERE id = ? AND status NOT IN (?, ?)', [id, 'lab_done', 'cancelled']);
        if (tests.length === 0) {
            return res.status(404).json({ success: false, message: 'Lab test not found or already completed/cancelled' });
        }

        await pool.query(
            'UPDATE lab_tests SET status = ?, notes = CONCAT(IFNULL(notes, ""), ?) WHERE id = ?',
            ['cancelled', reason ? '\nCancelled: ' + reason : '\nCancelled', id]
        );

        res.json({ success: true, message: 'Lab test cancelled successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get lab test statistics
exports.getLabTestStats = async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT
                COUNT(*) as total_tests,
                SUM(CASE WHEN status = 'requested' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'lab_done' THEN 1 ELSE 0 END) as lab_done,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN priority = 'emergency' AND status IN ('requested', 'in_progress') THEN 1 ELSE 0 END) as emergency_pending,
                AVG(CASE WHEN completed_date IS NOT NULL THEN TIMESTAMPDIFF(HOUR, requested_date, completed_date) ELSE NULL END) as avg_completion_hours
            FROM lab_tests
            WHERE requested_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);

        const [categoryStats] = await pool.query(`
            SELECT test_category, COUNT(*) as count,
                   SUM(CASE WHEN status = 'lab_done' THEN 1 ELSE 0 END) as lab_done
            FROM lab_tests
            WHERE requested_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY test_category
            ORDER BY count DESC
        `);

        res.json({
            success: true,
            stats: stats[0],
            categoryStats
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get lab test by ID
exports.getLabTestById = async (req, res) => {
    const { id } = req.params;
    try {
        const [tests] = await pool.query(`
SELECT lt.*, p.name as patient_name, p.age, p.gender, p.patient_type,
                   u1.name as doctor_name, u2.name as lab_technician_name
            FROM lab_tests lt
            LEFT JOIN patients pt ON lt.patient_id = pt.id
            LEFT JOIN users p ON pt.user_id = p.id
            LEFT JOIN doctors doc ON lt.doctor_id = doc.id
            LEFT JOIN users d ON doc.user_id = d.id
            LEFT JOIN users u1 ON lt.requested_by_user_id = u1.id
            LEFT JOIN users u2 ON lt.assigned_to_user_id = u2.id
            WHERE lt.id = ?
        `, [id]);

        if (tests.length === 0) {
            return res.status(404).json({ success: false, message: 'Lab test not found' });
        }

        res.json({ success: true, test: tests[0] });
    } catch (err) {
        console.error('Error in getLabTestById:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

