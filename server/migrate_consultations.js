const pool = require('./config/db');

const migrateConsultations = async () => {
    try {
        // Add consultation_fee to appointments table
        const checkConsultation = async () => {
            try {
                const [rows] = await pool.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'consultation_fee'`);
                return rows.length > 0;
            } catch (err) {
                return false;
            }
        };

        if (!await checkConsultation()) {
            await pool.query('ALTER TABLE appointments ADD COLUMN consultation_fee DECIMAL(10,2) DEFAULT 0');
            console.log('✓ Added consultation_fee column to appointments table');
        } else {
            console.log('✓ consultation_fee column already exists');
        }

        // Add patient_flow_tracking columns
        const checkStatus = async () => {
            try {
                const [rows] = await pool.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'patient_flow_tracking' AND COLUMN_NAME = 'appointment_id'`);
                return rows.length > 0;
            } catch (err) {
                return false;
            }
        };

        if (!await checkStatus()) {
            await pool.query('ALTER TABLE patient_flow_tracking ADD COLUMN appointment_id INT NULL');
            await pool.query('ALTER TABLE patient_flow_tracking ADD COLUMN doctor_name VARCHAR(100)');
            await pool.query('ALTER TABLE patient_flow_tracking ADD COLUMN consultation_fee DECIMAL(10,2) DEFAULT 0');
            console.log('✓ Added tracking columns to patient_flow_tracking table');
        } else {
            console.log('✓ tracking columns already exist');
        }

        // Add prescription_ids to bills
        const checkBillPrescriptions = async () => {
            try {
                const [rows] = await pool.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'bills' AND COLUMN_NAME = 'lab_test_ids'`);
                return rows.length > 0;
            } catch (err) {
                return false;
            }
        };

        if (!await checkBillPrescriptions()) {
            await pool.query('ALTER TABLE bills ADD COLUMN lab_test_ids JSON');
            await pool.query('ALTER TABLE bills ADD COLUMN prescription_ids JSON');
            console.log('✓ Added lab_test_ids and prescription_ids to bills table');
        } else {
            console.log('✓ bill detail columns already exist');
        }

        console.log('\n✅ Consultation migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during migration:', err.message);
        process.exit(1);
    }
};

migrateConsultations();
