const pool = require('./config/db');
const mysql = require('mysql2/promise');

async function fixLabPaths() {
  try {
    console.log('🔍 Checking for double uploads paths...');
    
    // Count doubles
    const [countResult] = await pool.query("SELECT COUNT(*) as count FROM lab_reports WHERE file_path LIKE 'uploads/uploads/%'");
    console.log(`Found ${countResult[0].count} records with double 'uploads/uploads/'`);

    // List them
    const [doubles] = await pool.query("SELECT id, patient_id, file_path FROM lab_reports WHERE file_path LIKE 'uploads/uploads/%' LIMIT 5");
    console.log('Sample doubles:', doubles);

    if (countResult[0].count > 0) {
      // Fix all
      const [fixResult] = await pool.query("UPDATE lab_reports SET file_path = REPLACE(file_path, 'uploads/uploads/', 'uploads/') WHERE file_path LIKE 'uploads/uploads/%'");
      console.log(`✅ Fixed ${fixResult.affectedRows} records`);

      // Verify
      const [afterCount] = await pool.query("SELECT COUNT(*) as count FROM lab_reports WHERE file_path LIKE 'uploads/uploads/%'");
      console.log(`Verification: ${afterCount[0].count} doubles remaining (should be 0)`);

      // Check specific file
      const [specific] = await pool.query("SELECT id, file_path FROM lab_reports WHERE file_path LIKE '%1775245163474%'");
      console.log('Specific file:', specific);
    } else {
      console.log('✅ No double paths found');
    }
    
// Fix Windows backslashes\nconst [backslashFix] = await pool.query("UPDATE lab_reports SET file_path = REPLACE(REPLACE(file_path, '\\\\', '/'), 'uploads\\\\', 'uploads/') WHERE file_path LIKE 'uploads\\\\%'");\nconsole.log(`✅ Fixed ${backslashFix.affectedRows} Windows backslash paths`);\n\n// Verify\n    const [afterBackslash] = await pool.query("SELECT COUNT(*) as count FROM lab_reports WHERE file_path LIKE 'uploads\\\\%'");\nconsole.log(`Verification: ${afterBackslash[0].count} backslash paths remaining (0 = good)`);\n\n// Show specific file\nconst [targetFile] = await pool.query("SELECT * FROM lab_reports WHERE file_path LIKE '%1775245163474%'");\nconsole.log('Target file AFTER FIX:', targetFile[0]?.file_path || 'NOT FOUND');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

fixLabPaths();

