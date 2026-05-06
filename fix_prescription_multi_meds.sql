USE hospital_mgm;

-- Add support for multiple medicines in prescriptions (JSON array)
-- Format: [{"id":1, "quantity":2, "dosage":"1-0-1", "instructions":"After food"}, ...]

-- Check if column exists, add if not (MySQL < 8.0 no IF NOT EXISTS for ALTER)
-- First check
SELECT COUNT(*) as col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_name = 'prescriptions' AND column_name = 'medicines';

-- If 0, run:
ALTER TABLE `prescriptions` ADD COLUMN `medicines` JSON AFTER `medicine_id`;

-- Verify
DESCRIBE prescriptions;
