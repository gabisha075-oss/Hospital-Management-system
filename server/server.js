// Enterprise Hospital Management System - Core Server
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();
const pool = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Run migrations on startup
const runMigrations = async () => {
    try {
        // 1. Add consultation_fee to appointments table
        const [consultationCheck] = await pool.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'consultation_fee'
        `);
        
        if (consultationCheck.length === 0) {
            await pool.query('ALTER TABLE appointments ADD COLUMN consultation_fee DECIMAL(10,2) DEFAULT 0');
            console.log('✓ Added consultation_fee column to appointments table');
        }

        // 2. Add columns to patient_flow_tracking
        const [trackingCheck] = await pool.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'patient_flow_tracking' AND COLUMN_NAME = 'appointment_id'
        `);
        
        if (trackingCheck.length === 0) {
            await pool.query('ALTER TABLE patient_flow_tracking ADD COLUMN appointment_id INT NULL');
            await pool.query('ALTER TABLE patient_flow_tracking ADD COLUMN doctor_name VARCHAR(100)');
            await pool.query('ALTER TABLE patient_flow_tracking ADD COLUMN consultation_fee DECIMAL(10,2) DEFAULT 0');
            console.log('✓ Added tracking columns to patient_flow_tracking table');
        }

        // 3. Add columns to bills table
        const [billCheck] = await pool.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'bills' AND COLUMN_NAME = 'lab_test_ids'
        `);
        
        if (billCheck.length === 0) {
            await pool.query('ALTER TABLE bills ADD COLUMN lab_test_ids JSON');
            await pool.query('ALTER TABLE bills ADD COLUMN prescription_ids JSON');
            console.log('✓ Added lab_test_ids and prescription_ids to bills table');
        }

// 4. Add payment tracking columns to bills table
        const [paymentCheck] = await pool.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'bills' AND COLUMN_NAME = 'last_payment_method'
        `);
        if (paymentCheck.length === 0) {
            await pool.query('ALTER TABLE bills ADD COLUMN last_payment_method VARCHAR(50)');
            await pool.query('ALTER TABLE bills ADD COLUMN last_payment_reference VARCHAR(100)');
            await pool.query('ALTER TABLE bills ADD COLUMN last_payment_date TIMESTAMP NULL');
            console.log('✓ Added payment tracking columns to bills table');
        }

        // 5. Create bill_items table if missing (CRITICAL for PDF downloads)
        const [billItemsCheck] = await pool.query("SHOW TABLES LIKE 'bill_items'");
        if (billItemsCheck.length === 0) {
            await pool.query(`
                CREATE TABLE bill_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    bill_id INT,
                    description VARCHAR(500),
                    amount DECIMAL(10,2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
                )
            `);
            console.log('✅ Created bill_items table');
            
            // Auto-populate existing bills
            await pool.query(`
                INSERT INTO bill_items (bill_id, description, amount)
                SELECT id, CONCAT('Consultation services - Bill #', id), total_amount 
                FROM bills WHERE id NOT IN (SELECT bill_id FROM bill_items)
            `);
            console.log('✅ Populated bill_items for existing bills');
        } else {
            console.log('ℹ️ bill_items table already exists');
        }

        // 6. Create patient_medicine_history table if missing (CRITICAL for prescription dispense)
        const [medicineHistoryCheck] = await pool.query("SHOW TABLES LIKE 'patient_medicine_history'");
        if (medicineHistoryCheck.length === 0) {
            await pool.query(`
                CREATE TABLE patient_medicine_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    patient_id INT NOT NULL,
                    medicine_id INT NOT NULL,
                    quantity INT DEFAULT 1,
                    dosage VARCHAR(100),
                    instructions TEXT,
                    issued_by_user_id INT,
                    prescription_id INT,
                    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (patient_id) REFERENCES patients(id),
                    FOREIGN KEY (medicine_id) REFERENCES medicines(id),
                    FOREIGN KEY (issued_by_user_id) REFERENCES users(id),
                    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
                    INDEX idx_patient (patient_id),
                    INDEX idx_medicine (medicine_id)
                )
            `);
            console.log('✅ Created patient_medicine_history table');
        } else {
            console.log('ℹ️ patient_medicine_history table already exists');
        }

        // Fix patient_flow_tracking.status ENUM truncation (dispense error)
        try {
            await pool.query(`
                ALTER TABLE patient_flow_tracking 
                MODIFY COLUMN status ENUM(
                    'checked_in','waiting','emergency','in_consultation','lab_test',
                    'pharmacy','admitted','discharged','billing','checked_out'
                ) DEFAULT 'checked_in'
            `);
            console.log('✓ Fixed patient_flow_tracking.status ENUM (dispense truncation fix)');
        } catch (enumFixErr) {
            if (enumFixErr.message.includes('duplicate') || enumFixErr.message.includes('already')) {
                console.log('ℹ️ patient_flow_tracking.status ENUM already fixed');
            } else {
                console.log('Note: Could not fix status ENUM:', enumFixErr.message);
            }
        }

        // 5. Create payments table if it doesn't exist
        const [paymentsTableCheck] = await pool.query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'payments'
        `);
        
        if (paymentsTableCheck.length === 0) {
            await pool.query(`
                CREATE TABLE payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    bill_id INT,
                    amount DECIMAL(10,2),
                    payment_method VARCHAR(50),
                    reference_number VARCHAR(100),
                    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
                )
            `);
            console.log('✓ Created payments table');
        }

        // 6. Fix lab_tests status enum to use 'lab_done' instead of 'completed'
        try {
            await pool.query(`
                ALTER TABLE lab_tests 
                MODIFY status ENUM('requested','in_progress','lab_done','cancelled') DEFAULT 'requested'
            `);
            console.log('✓ Updated lab_tests status ENUM to include lab_done');
        } catch (enumErr) {
            if (enumErr.message.includes('Duplicate entry')) {
                console.log('✓ lab_tests status ENUM already updated');
            } else {
                console.log('Note: Could not update lab_tests enum:', enumErr.message);
            }
        }
        // 7. Create admission_requests table if it doesn't exist
        const [admissionRequestCheck] = await pool.query("SHOW TABLES LIKE 'admission_requests'");
        if (admissionRequestCheck.length === 0) {
            await pool.query(`
                CREATE TABLE admission_requests (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    patient_id INT NOT NULL,
                    doctor_id INT NOT NULL,
                    requested_by_user_id INT NOT NULL,
                    appointment_id INT NULL,
                    prescription_id INT NULL,
                    stay_days INT NOT NULL,
                    daily_room_rate DECIMAL(10,2) DEFAULT 1000.00,
                    notes TEXT,
                    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed_at TIMESTAMP NULL,
                    processed_by_user_id INT NULL,
                    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
                    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
                    FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (processed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
                )
            `);
            console.log('Created admission_requests table');
        }
        // 8. Add pending_lab_test_ids to appointments for Waiting -> Return flow persistence
        const [pendingLabTestsCol] = await pool.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'pending_lab_test_ids'
        `);
        if (pendingLabTestsCol.length === 0) {
            await pool.query('ALTER TABLE appointments ADD COLUMN pending_lab_test_ids JSON NULL');
            console.log('Added pending_lab_test_ids column to appointments');
        }
        // 9. Add walk-in consultation support columns to appointments
        const [appointmentTypeCol] = await pool.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'appointment_type'
        `);
        if (appointmentTypeCol.length === 0) {
            await pool.query(`ALTER TABLE appointments ADD COLUMN appointment_type ENUM('booked','walkin') DEFAULT 'booked'`);
            console.log('Added appointment_type column to appointments');
        }

        const [walkinTokenCol] = await pool.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'walkin_token'
        `);
        if (walkinTokenCol.length === 0) {
            await pool.query(`ALTER TABLE appointments ADD COLUMN walkin_token VARCHAR(20) NULL`);
            console.log('Added walkin_token column to appointments');
        }

        const [walkinPriorityCol] = await pool.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'walkin_priority'
        `);
        if (walkinPriorityCol.length === 0) {
            await pool.query(`ALTER TABLE appointments ADD COLUMN walkin_priority ENUM('routine','urgent','emergency') DEFAULT 'routine'`);
            console.log('Added walkin_priority column to appointments');
        }

        console.log('✅ All migrations completed successfully!\n');
    } catch (err) {
        console.error('⚠️ Migration warning:', err.message);
        // Don't fail on migrations - table might already exist with columns
    }
};

// Health check endpoint for diagnostics
app.get('/api/health', async (req, res) => {
  try {
    // DB connection test
    const [result] = await pool.query('SELECT 1 as healthy');
    
    // Check critical tables
    const criticalTables = ['bills', 'bill_items', 'patient_medicine_history', 'lab_tests', 'prescriptions', 'patients', 'doctors', 'medicines'];
    const tableStatus = {};
    for (const table of criticalTables) {
      try {
        const [rows] = await pool.query(`SHOW TABLES LIKE ?`, [table]);
        tableStatus[table] = rows.length > 0 ? 'OK' : 'MISSING';
      } catch (e) {
        tableStatus[table] = 'ERROR: ' + e.message;
      }
    }

    // Sample data check
    const [billCount] = await pool.query('SELECT COUNT(*) as count FROM bills');
    const [itemCount] = await pool.query('SELECT COUNT(*) as count FROM bill_items');

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      db: 'connected',
      tables: tableStatus,
      bills: billCount[0].count,
      bill_items: itemCount[0].count,
      migrations_needed: Object.values(tableStatus).some(status => status.includes('MISSING') || status.includes('ERROR')),
      message: 'Server healthy - check tables array for issues'
    });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Routes (to be implemented)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/billing', require('./routes/billingRoutes'));
app.use('/api/pharmacy', require('./routes/pharmacyRoutes'));
app.use('/api/lab', require('./routes/labRoutes'));
app.use('/api/lab-tests', require('./routes/labTestRoutes'));
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));
app.use('/api/patient-flow', require('./routes/patientFlowRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/beds', require('./routes/bedRoutes'));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 5000;

// Import and init AutoFlowEngine
const AutoFlowEngine = require('./utils/autoFlowEngine');

// Start server with migrations
const startServer = async () => {
    try {
        await runMigrations();
        app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
            // Initialize auto-flow cron jobs
            new AutoFlowEngine();
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();



