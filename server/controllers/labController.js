const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'lab_reports');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Only allow PDFs
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }
        cb(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Upload lab report
exports.uploadReport = [
    upload.single('report'),
    async (req, res) => {
        const { patient_id } = req.body;
        const uploaded_by = req.user.id;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const file_path = path.join('uploads', 'lab_reports', req.file.filename);

        try {
            await pool.query(
                'INSERT INTO lab_reports (patient_id, file_path, uploaded_by_user_id) VALUES (?, ?, ?)',
                [patient_id, file_path, uploaded_by]
            );
            
            // Mark related lab tests as completed
            await pool.query(
                'UPDATE lab_tests SET status = "lab_done", completed_date = NOW() WHERE patient_id = ? AND status IN ("in_progress", "requested") ORDER BY requested_date DESC LIMIT 1',
                [patient_id]
            );

            res.status(201).json({ success: true, message: 'Lab report uploaded & tests marked completed', file_path });
        } catch (err) {
            console.error('Error uploading lab report:', err);
            res.status(500).json({ success: false, message: 'Failed to upload lab report' });
        }
    }
];

// Get lab reports for a patient
exports.getReportsByPatient = async (req, res) => {
    const { patient_id } = req.params;

    try {
        const [reports] = await pool.query(
            'SELECT id, patient_id, file_path, uploaded_by_user_id, created_at FROM lab_reports WHERE patient_id = ? ORDER BY created_at DESC',
            [patient_id]
        );

        res.status(200).json({ success: true, reports });
    } catch (err) {
        console.error('Error fetching lab reports:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch lab reports' });
    }
};