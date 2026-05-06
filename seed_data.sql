USE hospital_mgm;

-- Insert Users with bcrypt hashed passwords (password: 123456)
INSERT INTO users (name, email, password, role) VALUES
('Dr. Arun Kumar', 'arun@hospital.com', '$2a$10$K8q5t5Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'doctor'),
('Dr. Priya Sharma', 'priya@hospital.com', '$2a$10$K8q5t5Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'doctor'),
('Dr. Raj Singh', 'raj@hospital.com', '$2a$10$K8q5t5Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'doctor'),
('Receptionist Anita', 'anita@hospital.com', '$2a$10$K8q5t5Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'receptionist'),
('Lab Tech Rajesh', 'rajesh@hospital.com', '$2a$10$K8q5t5Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'lab'),
('Pharmacist Nitin', 'nitin@hospital.com', '$2a$10$K8q5t5Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'pharmacist'),
('John Doe', 'john@patient.com', '$2a$10$K8q5t5Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'patient'),
('Sarah Smith', 'sarah@patient.com', '$2a$10$K8q5t5Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'patient'),
('Rahul Patel', 'rahul@patient.com', '$2a$10$K8q5t5Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'patient'),
('Anjali Verma', 'anjali@patient.com', '$2a$10$K8q5t5Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'patient'),
('Vikram Singh', 'vikram@patient.com', '$2a$10$K8q5t5Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8', 'patient');

-- Insert Departments
INSERT INTO departments (name, description) VALUES 
('Cardiology', 'Heart and blood vessel specialist'),
('Neurology', 'Brain and nervous system specialist'),
('Pediatrics', 'Children and infant care'),
('General Medicine', 'General medical care and services'),
('Surgery', 'Surgical procedures and operations'),
('Pharmacy', 'Medicine and pharmaceutical services');

-- Insert Doctors
INSERT INTO doctors (user_id, department_id, specialization, experience) VALUES 
(2, 1, 'Cardiologist', 15),
(3, 2, 'Neurologist', 12),
(4, 4, 'General Practitioner', 8);

-- Insert Patients (Outpatients)
INSERT INTO patients (user_id, age, gender, blood_group, phone, address, patient_type) VALUES 
(8, 45, 'Male', 'O+', '9876543210', '123 Main St, City', 'outpatient'),
(9, 38, 'Female', 'A+', '9876543211', '456 Oak Ave, City', 'outpatient'),
(10, 52, 'Male', 'B+', '9876543212', '789 Pine Rd, City', 'outpatient');

-- Insert Patients (Inpatients with admission dates)
INSERT INTO patients (user_id, age, gender, blood_group, phone, address, patient_type, admitted_date, admitted_by) VALUES 
(11, 65, 'Female', 'AB+', '9876543213', '321 Elm St, City', 'inpatient', NOW(), 1),
(12, 72, 'Male', 'O-', '9876543214', '654 Maple Dr, City', 'inpatient', DATE_SUB(NOW(), INTERVAL 3 DAY), 1);

-- Insert Wards with bed counts
INSERT INTO wards (name, description, total_beds, available_beds) VALUES 
('General Ward', 'General patient care ward', 20, 8),
('Cardiology Ward', 'Specialized cardiac care', 15, 5),
('Neurology Ward', 'Specialized neurological care', 12, 3),
('ICU', 'Intensive Care Unit', 10, 2),
('Pediatrics Ward', 'Children care ward', 15, 7);

-- Insert Beds
INSERT INTO beds (ward_id, bed_number, room_number, status, bed_type, price_per_day) VALUES 
(1, 'B101', 'R101', 'available', 'general', 500),
(1, 'B102', 'R101', 'available', 'general', 500),
(1, 'B103', 'R102', 'occupied', 'general', 500),
(1, 'B104', 'R102', 'available', 'general', 500),
(2, 'B201', 'R201', 'available', 'private', 1500),
(2, 'B202', 'R201', 'occupied', 'private', 1500),
(2, 'B203', 'R202', 'available', 'private', 1500),
(3, 'B301', 'R301', 'available', 'semi_private', 800),
(3, 'B302', 'R301', 'occupied', 'semi_private', 800),
(4, 'B401', 'R401', 'available', 'icu', 3000),
(4, 'B402', 'R401', 'available', 'icu', 3000),
(5, 'B501', 'R501', 'available', 'general', 400);

-- Insert Bed Assignments
INSERT INTO bed_assignments (patient_id, bed_id, assigned_by_user_id, admission_date, status, notes, discharge_date) VALUES 
(4, 3, 1, NOW(), 'active', 'Regular observation', NULL),
(4, 8, 1, DATE_SUB(NOW(), INTERVAL 3 DAY), 'active', 'Post-cardiac monitoring', NULL),
(5, 2, 1, DATE_SUB(NOW(), INTERVAL 5 DAY), 'discharged', 'Completed recovery', DATE_SUB(NOW(), INTERVAL 2 DAY));

-- Insert Lab Tests
INSERT INTO lab_tests (patient_id, doctor_id, test_name, test_category, priority, status, requested_by_user_id, requested_date) VALUES 
(1, 1, 'Complete Blood Count', 'blood', 'routine', 'completed', 2, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 2, 'Brain MRI Scan', 'mri', 'urgent', 'in_progress', 3, NOW()),
(3, 1, 'ECG Test', 'ecg', 'routine', 'requested', 2, NOW()),
(4, 1, 'Cardiac Ultrasound', 'ultrasound', 'emergency', 'in_progress', 2, NOW()),
(4, 2, 'Blood Glucose Test', 'blood', 'routine', 'requested', 3, NOW()),
(5, 1, 'Chest X-Ray', 'xray', 'routine', 'completed', 2, DATE_SUB(NOW(), INTERVAL 2 DAY));

-- Insert Patient Flow Tracking
INSERT INTO patient_flow_tracking (patient_id, doctor_id, department_id, status, check_in_time, notes) VALUES 
(1, 1, 1, 'waiting', NOW(), 'First time visit'),
(2, 2, 2, 'in_consultation', DATE_SUB(NOW(), INTERVAL 30 MINUTE), 'Follow-up consultation'),
(3, 1, 1, 'lab_test', NOW(), 'Lab test in progress'),
(4, 1, 1, 'admitted', DATE_SUB(NOW(), INTERVAL 4 HOUR), 'Emergency admission'),
(5, 2, 2, 'admitted', DATE_SUB(NOW(), INTERVAL 3 DAY), 'Ongoing treatment');

-- Insert Medicines
INSERT INTO medicines (name, stock, price, expiry_date) VALUES 
('Aspirin 100mg', 500, 25.00, DATE_ADD(NOW(), INTERVAL 6 MONTH)),
('Metformin 500mg', 300, 50.00, DATE_ADD(NOW(), INTERVAL 8 MONTH)),
('Atorvastatin 10mg', 250, 75.00, DATE_ADD(NOW(), INTERVAL 7 MONTH)),
('Amlodipine 5mg', 400, 60.00, DATE_ADD(NOW(), INTERVAL 9 MONTH)),
('Lisinopril 10mg', 350, 55.00, DATE_ADD(NOW(), INTERVAL 6 MONTH)),
('Omeprazole 20mg', 600, 40.00, DATE_ADD(NOW(), INTERVAL 10 MONTH));

-- Insert Appointments
INSERT INTO appointments (patient_id, doctor_id, appointment_date, status) VALUES 
(1, 1, DATE_ADD(NOW(), INTERVAL 2 DAY), 'pending'),
(2, 2, DATE_ADD(NOW(), INTERVAL 1 DAY), 'approved'),
(3, 1, TODAY(), 'approved'),
(1, 1, DATE_SUB(NOW(), INTERVAL 1 DAY), 'completed');

-- Insert Bills (sample)
INSERT INTO bills (patient_id, total_amount, paid_amount, status) VALUES 
(1, 2500.00, 2500.00, 'paid'),
(2, 5000.00, 2500.00, 'partial'),
(3, 3000.00, 0.00, 'unpaid');

-- Insert Bill Items
INSERT INTO bill_items (bill_id, description, amount) VALUES 
(1, 'Cardiology Consultation', 1000.00),
(1, 'ECG Test', 500.00),
(1, 'Medications', 1000.00),
(2, 'Neurology Consultation', 1500.00),
(2, 'MRI Scan', 3500.00),
(3, 'General Consultation', 800.00),
(3, 'Lab Tests', 1200.00),
(3, 'Medications', 1000.00);
