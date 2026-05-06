CREATE DATABASE IF NOT EXISTS hospital_mgm;
USE hospital_mgm;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  role ENUM('admin','doctor','receptionist','lab','pharmacist','patient'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  description TEXT
);

CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  department_id INT,
  specialization VARCHAR(100),
  experience INT,
  availability_status BOOLEAN DEFAULT true,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  patient_type ENUM('outpatient','inpatient') DEFAULT 'outpatient',
  age INT,
  gender VARCHAR(10),
  blood_group VARCHAR(5),
  phone VARCHAR(20),
  address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  doctor_id INT,
  appointment_date DATETIME,
  status ENUM('pending','approved','completed','cancelled') DEFAULT 'pending',
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  total_amount DECIMAL(10,2),
  paid_amount DECIMAL(10,2),
  status ENUM('paid','unpaid','partial') DEFAULT 'unpaid',
  last_payment_method VARCHAR(50),
  last_payment_reference VARCHAR(100),
  last_payment_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT,
  amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  stock INT,
  price DECIMAL(10,2),
  expiry_date DATE
);

CREATE TABLE IF NOT EXISTS lab_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  file_path VARCHAR(255),
  uploaded_by_user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  doctor_id INT,
  medicine_id INT,
  dosage VARCHAR(100),
  instructions TEXT,
  status ENUM('pending','dispensed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS patient_medicine_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  medicine_id INT,
  quantity INT,
  dosage VARCHAR(100),
  instructions TEXT,
  issued_by_user_id INT,
  prescription_id INT,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL,
  FOREIGN KEY (issued_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS patient_flow_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  doctor_id INT,
  department_id INT,
  status ENUM('checked_in','waiting','emergency','in_consultation','lab_test','admitted','discharged','checked_out') DEFAULT 'checked_in',
  check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  check_out_time TIMESTAMP NULL,
  duration_minutes INT,
  notes TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- New tables for outpatient/inpatient management and bed system
CREATE TABLE IF NOT EXISTS wards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  total_beds INT DEFAULT 0,
  available_beds INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ward_id INT,
  bed_number VARCHAR(20),
  room_number VARCHAR(20),
  status ENUM('available','occupied','maintenance','reserved') DEFAULT 'available',
  bed_type ENUM('general','icu','private','semi_private') DEFAULT 'general',
  price_per_day DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bed_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  bed_id INT,
  assigned_by_user_id INT,
  assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  admission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  discharge_date TIMESTAMP NULL,
  status ENUM('active','discharged','transferred') DEFAULT 'active',
  notes TEXT,
  total_cost DECIMAL(10,2) DEFAULT 0,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lab_tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  doctor_id INT,
  test_name VARCHAR(200),
  test_category ENUM('blood','urine','xray','mri','ct_scan','ecg','ultrasound','biopsy','other') DEFAULT 'blood',
  priority ENUM('routine','urgent','emergency') DEFAULT 'routine',
  status ENUM('requested','in_progress','lab_done','cancelled') DEFAULT 'requested',
  requested_by_user_id INT,
  assigned_to_user_id INT,
  requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_date TIMESTAMP NULL,
  results TEXT,
  notes TEXT,
  cost DECIMAL(10,2) DEFAULT 0,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admission_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  requested_by_user_id INT NOT NULL,
  appointment_id INT NULL,
  prescription_id INT NULL,
  stay_days INT NOT NULL,
  daily_room_rate DECIMAL(10,2) DEFAULT 1000.00,
  notes TEXT,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  processed_by_user_id INT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Update patients table to include patient type
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_type ENUM('outpatient','inpatient') DEFAULT 'outpatient';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS admitted_date TIMESTAMP NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS discharged_date TIMESTAMP NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS admitted_by INT NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS discharged_by INT NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE patients ADD FOREIGN KEY (admitted_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE patients ADD FOREIGN KEY (discharged_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add payment tracking columns to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS last_payment_method VARCHAR(50);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS last_payment_reference VARCHAR(100);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP NULL;
