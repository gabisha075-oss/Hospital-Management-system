const pool = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const [[{ total_patients }]] = await pool.query('SELECT COUNT(*) as total_patients FROM patients');
        const [[{ total_doctors }]] = await pool.query('SELECT COUNT(*) as total_doctors FROM doctors');
        const [[{ total_revenue }]] = await pool.query('SELECT SUM(total_amount) as total_revenue FROM bills');
        const [monthly_revenue] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(total_amount) as total
      FROM bills
      GROUP BY month
      ORDER BY month DESC
      LIMIT 6
    `);
        const [appointment_stats] = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM appointments
      GROUP BY status
    `);

        res.json({
            success: true,
            stats: {
                total_patients,
                total_doctors,
                total_revenue: total_revenue || 0,
                monthly_revenue,
                appointment_stats
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get live patient flow for receptionist dashboard
exports.getLivePatientFlow = async (req, res) => {
    try {
        const [current_patients] = await pool.query(`
            SELECT pft.*, p.patient_type, u.name as patient_name, d.specialization,
                   TIMESTAMPDIFF(MINUTE, pft.check_in_time, NOW()) as wait_time_minutes
            FROM patient_flow_tracking pft
            JOIN patients p ON pft.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN doctors doc ON pft.doctor_id = doc.id
            LEFT JOIN users d ON doc.user_id = d.id
            WHERE pft.check_out_time IS NULL
            ORDER BY
                CASE pft.status
                    WHEN 'emergency' THEN 1
                    WHEN 'waiting' THEN 2
                    WHEN 'in_consultation' THEN 3
                    WHEN 'lab_test' THEN 4
                    WHEN 'admitted' THEN 5
                    WHEN 'discharged' THEN 6
                END,
                pft.check_in_time ASC
        `);

        const [today_stats] = await pool.query(`
            SELECT
                COUNT(*) as total_today,
                SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
                SUM(CASE WHEN status = 'in_consultation' THEN 1 ELSE 0 END) as in_consultation,
                SUM(CASE WHEN status = 'lab_test' THEN 1 ELSE 0 END) as in_lab,
                SUM(CASE WHEN status = 'admitted' THEN 1 ELSE 0 END) as admitted,
                SUM(CASE WHEN status = 'discharged' THEN 1 ELSE 0 END) as discharged,
                SUM(CASE WHEN check_out_time IS NOT NULL THEN 1 ELSE 0 END) as completed_today
            FROM patient_flow_tracking
            WHERE DATE(check_in_time) = CURDATE()
        `);

        const [queue_stats] = await pool.query(`
            SELECT
                COUNT(*) as total_queue,
                AVG(TIMESTAMPDIFF(MINUTE, check_in_time, NOW())) as avg_wait_time,
                MAX(TIMESTAMPDIFF(MINUTE, check_in_time, NOW())) as max_wait_time,
                MIN(TIMESTAMPDIFF(MINUTE, check_in_time, NOW())) as min_wait_time
            FROM patient_flow_tracking
            WHERE check_out_time IS NULL AND status IN ('waiting', 'emergency')
        `);

        res.json({
            success: true,
            live_flow: current_patients,
            today_stats: today_stats[0],
            queue_stats: queue_stats[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Stream live patient flow via Server-Sent Events
exports.streamLivePatientFlow = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendUpdate = async () => {
        try {
            const [current_patients] = await pool.query(`
                SELECT pft.*, p.patient_type, u.name as patient_name, d.specialization,
                       TIMESTAMPDIFF(MINUTE, pft.check_in_time, NOW()) as wait_time_minutes
                FROM patient_flow_tracking pft
                JOIN patients p ON pft.patient_id = p.id
                JOIN users u ON p.user_id = u.id
                LEFT JOIN doctors doc ON pft.doctor_id = doc.id
                LEFT JOIN users d ON doc.user_id = d.id
                WHERE pft.check_out_time IS NULL
                ORDER BY
                    CASE pft.status
                        WHEN 'emergency' THEN 1
                        WHEN 'waiting' THEN 2
                        WHEN 'in_consultation' THEN 3
                        WHEN 'lab_test' THEN 4
                        WHEN 'admitted' THEN 5
                        WHEN 'discharged' THEN 6
                    END,
                    pft.check_in_time ASC
            `);

            const [today_stats] = await pool.query(`
                SELECT
                    COUNT(*) as total_today,
                    SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
                    SUM(CASE WHEN status = 'in_consultation' THEN 1 ELSE 0 END) as in_consultation,
                    SUM(CASE WHEN status = 'lab_test' THEN 1 ELSE 0 END) as in_lab,
                    SUM(CASE WHEN status = 'admitted' THEN 1 ELSE 0 END) as admitted,
                    SUM(CASE WHEN status = 'discharged' THEN 1 ELSE 0 END) as discharged,
                    SUM(CASE WHEN check_out_time IS NOT NULL THEN 1 ELSE 0 END) as completed_today
                FROM patient_flow_tracking
                WHERE DATE(check_in_time) = CURDATE()
            `);

            const [queue_stats] = await pool.query(`
                SELECT
                    COUNT(*) as total_queue,
                    AVG(TIMESTAMPDIFF(MINUTE, check_in_time, NOW())) as avg_wait_time,
                    MAX(TIMESTAMPDIFF(MINUTE, check_in_time, NOW())) as max_wait_time,
                    MIN(TIMESTAMPDIFF(MINUTE, check_in_time, NOW())) as min_wait_time
                FROM patient_flow_tracking
                WHERE check_out_time IS NULL AND status IN ('waiting', 'emergency')
            `);

            const payload = JSON.stringify({
                live_flow: current_patients,
                today_stats: today_stats[0],
                queue_stats: queue_stats[0]
            });

            res.write(`event: liveFlow\ndata: ${payload}\n\n`);
        } catch (error) {
            res.write(`event: error\ndata: ${JSON.stringify({ success: false, message: error.message })}\n\n`);
        }
    };

    const intervalId = setInterval(sendUpdate, 10000);
    sendUpdate();

    req.on('close', () => {
        clearInterval(intervalId);
        res.end();
    });
};

// Get receptionist dashboard data
exports.getReceptionistDashboard = async (req, res) => {
    try {
        // Today's appointments
        const [today_appointments] = await pool.query(`
            SELECT a.*, p.patient_type, u.name as patient_name, d.specialization,
                   TIME_FORMAT(a.appointment_time, '%H:%i') as time_formatted
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN doctors doc ON a.doctor_id = doc.id
            LEFT JOIN users d ON doc.user_id = d.id
            WHERE DATE(a.appointment_date) = CURDATE()
            ORDER BY a.appointment_time ASC
        `);

        // Pending lab tests
        const [pending_lab_tests] = await pool.query(`
            SELECT lt.id, lt.test_name, lt.priority, lt.requested_date,
                   p.patient_type, u.name as patient_name
            FROM lab_tests lt
            JOIN patients p ON lt.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE lt.status IN ('requested', 'in_progress')
            ORDER BY
                CASE lt.priority
                    WHEN 'emergency' THEN 1
                    WHEN 'urgent' THEN 2
                    WHEN 'routine' THEN 3
                END,
                lt.requested_date ASC
            LIMIT 10
        `);

        // Bed availability summary
        const [bed_summary] = await pool.query(`
            SELECT
                COUNT(*) as total_beds,
                SUM(CASE WHEN ba.patient_id IS NULL THEN 1 ELSE 0 END) as available_beds,
                SUM(CASE WHEN ba.patient_id IS NOT NULL THEN 1 ELSE 0 END) as occupied_beds
            FROM beds b
            LEFT JOIN bed_assignments ba ON b.id = ba.bed_id AND ba.discharge_date IS NULL
        `);

        // Recent discharges (last 24 hours)
        const [recent_discharges] = await pool.query(`
            SELECT p.id, u.name as patient_name, p.discharged_date,
                   TIMESTAMPDIFF(HOUR, p.admitted_date, p.discharged_date) as stay_hours
            FROM patients p
            JOIN users u ON p.user_id = u.id
            WHERE p.patient_type = 'outpatient'
            AND p.discharged_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ORDER BY p.discharged_date DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            dashboard: {
                today_appointments,
                pending_lab_tests,
                bed_summary: bed_summary[0],
                recent_discharges
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

