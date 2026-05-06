-- Fix missing bill_items table for PDF downloads
-- Run this in your MySQL database

CREATE TABLE IF NOT EXISTS `bill_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bill_id` int(11) NOT NULL,
  `description` varchar(500) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bill_id` (`bill_id`),
  CONSTRAINT `bill_items_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add missing items for existing bills (consultation fee)
INSERT IGNORE INTO bill_items (bill_id, description, amount)
SELECT b.id, CONCAT('Consultation services - Bill #', b.id), b.total_amount 
FROM bills b 
LEFT JOIN bill_items bi ON b.id = bi.bill_id 
WHERE bi.id IS NULL;

-- Verify
SELECT 'Bills table exists' as status, COUNT(*) as count FROM bills 
UNION ALL 
SELECT 'Bill items table exists', COUNT(*) FROM bill_items;

