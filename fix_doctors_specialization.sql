USE hospital_mgm;
ALTER TABLE doctors ADD COLUMN  specialization VARCHAR(100) ;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience ;
 DESCRIBE doctors;