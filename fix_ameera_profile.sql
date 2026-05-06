-- Fix Ameera Patient Profile & Reports - Run Entire Script
SET @user_email = 'ameera@hms.com';

-- 1. Create/find Ameera user (if not exists)
INSERT IGNORE INTO users (email, password, name, role) VALUES (@user_email, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ameera', 'patient');

-- 2. Create patient record
INSERT IGNORE INTO patients (user_id, patient_type, age, gender, phone, address) 
SELECT u.id, 'outpatient', 25, 'Female', '9876543210', '123 Main St' 
FROM users u WHERE u.email = @user_email AND u.id NOT IN (SELECT user_id FROM patients);

-- 3. Ensure doctor exists for lab_tests
INSERT IGNORE INTO doctors (user_id, department_id, specialization) VALUES (2, 1, 'Lab Medicine');

-- 4. Seed lab test for Ameera
INSERT INTO lab_tests (patient_id, doctor_id, test_name, test_category, priority, requested_by_user_id, status, completed_date, results, cost) 
SELECT p.id, 1, 'Complete Blood Workup', 'blood', 'routine', 2, 'lab_done', NOW(), 'Hemoglobin 12.8 g/dL, WBC 7.2, Normal ranges', 350
FROM patients p JOIN users u ON p.user_id = u.id WHERE u.email = @user_email;

-- 5. Seed lab report (uses existing PDF)
INSERT INTO lab_reports (patient_id, file_path, uploaded_by_user_id) 
SELECT p.id, 'uploads/lab_reports/1772012037132.pdf', 3
FROM patients p JOIN users u ON p.user_id = u.id WHERE u.email = @user_email;

-- 6. VERIFICATION
SELECT '=== VERIFICATION ===';
SELECT 'USER:', u.id, u.name, u.email FROM users u WHERE u.email = @user_email;
SELECT 'PATIENT:', p.id FROM patients p JOIN users u ON p.user_id = u.id WHERE u.email = @user_email;
SELECT 'LAB_TEST:', lt.id, lt.test_name FROM lab_tests lt JOIN patients p ON lt.patient_id = p.id JOIN users u ON p.user_id = u.id WHERE u.email = @user_email;
SELECT 'LAB_REPORT:', lr.id, lr.file_path FROM lab_reports lr JOIN patients p ON lr.patient_id = p.id JOIN users u ON p.user_id = u.id WHERE u.email = @user_email;

SELECT '=== FIXED - Restart server and test ===';

