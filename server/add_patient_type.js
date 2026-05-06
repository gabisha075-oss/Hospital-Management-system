const pool = require('./config/db');

async function addPatientType() {
    try {
        // Check if column already exists
        const [columns] = await pool.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'patients' AND COLUMN_NAME = 'patient_type'
        `);

        if (columns.length > 0) {
            console.log('✓ patient_type column already exists');
            process.exit(0);
        }

        // Add the column if it doesn't exist
        await pool.query(`
            ALTER TABLE patients 
            ADD COLUMN patient_type ENUM('outpatient','inpatient') DEFAULT 'outpatient' 
            AFTER user_id
        `);

        console.log('✓ Successfully added patient_type column to patients table');
        process.exit(0);
    } catch (err) {
        console.error('Error adding patient_type column:', err.message);
        process.exit(1);
    }
}

addPatientType();
