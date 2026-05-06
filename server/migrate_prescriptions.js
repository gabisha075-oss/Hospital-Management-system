const pool = require('./config/db');

const createPrescriptionsTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS prescriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                patient_id INT NOT NULL,
                doctor_id INT NOT NULL,
                medicine_id INT NOT NULL,
                dosage VARCHAR(100),
                instructions TEXT,
                status ENUM('pending', 'dispensed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
                FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
            )
        `);
        console.log('Prescriptions table created or already exists.');
        process.exit(0);
    } catch (err) {
        console.error('Error creating prescriptions table:', err);
        process.exit(1);
    }
};

createPrescriptionsTable();
