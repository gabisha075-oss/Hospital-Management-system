-- Fully Automated Patient Flow Triggers
-- Run: mysql -u root -p hospital_mgm < fix_patient_flow_triggers.sql

USE hospital_mgm;

DELIMITER $$

-- TRIGGER 1: All pending lab tests for patient completed → Move to pharmacy/billing
CREATE TRIGGER after_lab_test_completion 
AFTER UPDATE ON lab_tests
FOR EACH ROW
BEGIN
    IF NEW.status = 'lab_done' AND OLD.status != 'lab_done' THEN
        -- Check if ALL lab tests for this patient are done
        SET @pending_labs = (
            SELECT COUNT(*) FROM lab_tests 
            WHERE patient_id = NEW.patient_id 
            AND status IN ('requested', 'in_progress')
        );
        
        IF @pending_labs = 0 THEN
            -- Check if patient has pending prescription
            SET @pending_rx = (
                SELECT COUNT(*) FROM prescriptions 
                WHERE patient_id = NEW.patient_id AND status = 'pending'
            );
            
            UPDATE patient_flow_tracking 
            SET status = CASE 
                WHEN @pending_rx > 0 THEN 'pharmacy' 
                ELSE 'billing' 
            END
            WHERE patient_id = NEW.patient_id AND check_out_time IS NULL;
        END IF;
    END IF;
END$$

-- TRIGGER 2: Prescription dispensed → Move to billing
CREATE TRIGGER after_prescription_dispensed
AFTER UPDATE ON prescriptions
FOR EACH ROW
BEGIN
    IF NEW.status = 'dispensed' AND OLD.status != 'dispensed' THEN
        UPDATE patient_flow_tracking 
        SET status = 'billing'
        WHERE patient_id = NEW.patient_id AND check_out_time IS NULL
        AND status IN ('pharmacy', 'lab_test');
    END IF;
END$$

-- TRIGGER 3: Bill fully paid → Auto-checkout/discharge
CREATE TRIGGER after_bill_paid
AFTER UPDATE ON bills
FOR EACH ROW
BEGIN
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        UPDATE patient_flow_tracking 
        SET status = 'checked_out', 
            check_out_time = NOW(),
            duration_minutes = TIMESTAMPDIFF(MINUTE, check_in_time, NOW())
        WHERE patient_id = NEW.patient_id AND check_out_time IS NULL;
        
        -- For inpatients, mark discharge if outpatient flow
        UPDATE patients 
        SET discharged_date = NOW()
        WHERE id = NEW.patient_id AND patient_type = 'outpatient';
    END IF;
END$$

-- TRIGGER 4: Appointment starts → Auto to consultation
CREATE TRIGGER after_appointment_approved
AFTER UPDATE ON appointments
FOR EACH ROW
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        UPDATE patient_flow_tracking 
        SET status = 'in_consultation',
            doctor_id = NEW.doctor_id
        WHERE patient_id = NEW.patient_id 
        AND check_out_time IS NULL 
        AND status = 'waiting';
    END IF;
END$$

DELIMITER ;

