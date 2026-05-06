const pool = require('./config/db');

const migratePatients = async () => {
    try {
        // Add missing columns to patients table
        const checkColumns = async (column) => {
            try {
                const [rows] = await pool.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'patients' AND COLUMN_NAME = ?`, [column]);
                return rows.length > 0;
            } catch (err) {
                return false;
            }
        };

        // Check and add discharged_date column
        if (!await checkColumns('discharged_date')) {
            await pool.query('ALTER TABLE patients ADD COLUMN discharged_date TIMESTAMP NULL');
            console.log('✓ Added discharged_date column to patients table');
        } else {
            console.log('✓ discharged_date column already exists');
        }

        // Check and add admitted_date column
        if (!await checkColumns('admitted_date')) {
            await pool.query('ALTER TABLE patients ADD COLUMN admitted_date TIMESTAMP NULL');
            console.log('✓ Added admitted_date column to patients table');
        } else {
            console.log('✓ admitted_date column already exists');
        }

        // Check and add discharged_by column
        if (!await checkColumns('discharged_by')) {
            await pool.query('ALTER TABLE patients ADD COLUMN discharged_by INT NULL');
            console.log('✓ Added discharged_by column to patients table');
        } else {
            console.log('✓ discharged_by column already exists');
        }

        // Check and add admitted_by column
        if (!await checkColumns('admitted_by')) {
            await pool.query('ALTER TABLE patients ADD COLUMN admitted_by INT NULL');
            console.log('✓ Added admitted_by column to patients table');
        } else {
            console.log('✓ admitted_by column already exists');
        }

        console.log('\n✅ Patients table migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during patients migration:', err.message);
        process.exit(1);
    }
};

migratePatients();
