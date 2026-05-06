const pool = require('./config/db');

async function fixBackslashes() {
  const connection = await pool.promise();
  
  try {
    // Count before
    const [[before]] = await connection.execute("SELECT COUNT(*) as cnt FROM lab_reports WHERE file_path LIKE 'uploads\\%'");
    console.log(`Before: ${before.cnt} paths with backslashes`);
    
    // Fix
    const [result] = await connection.execute("UPDATE lab_reports SET file_path = REPLACE(file_path, '\\\\', '/') WHERE file_path LIKE 'uploads\\%'");
    console.log(`Fixed ${result.affectedRows} records`);
    
    // Verify
    const [[after]] = await connection.execute("SELECT COUNT(*) as cnt FROM lab_reports WHERE file_path LIKE 'uploads\\%'");
    console.log(`After: ${after.cnt} remaining (should be 0)`);
    
    // Specific file
    const [[specific]] = await connection.execute("SELECT file_path FROM lab_reports WHERE file_path LIKE '%1775245163474%'");
    console.log('Specific file:', specific[0]?.file_path);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    connection.end();
    pool.end();
  }
}

fixBackslashes();
