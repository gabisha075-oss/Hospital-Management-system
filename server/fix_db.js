const pool = require('./config/db');

const fixData = async () => {
    try {
        console.log('Starting DB fix...');

        // 1. Find doctors without records
        const [doctors] = await pool.query(
            "SELECT u.id, u.name FROM users u LEFT JOIN doctors d ON u.id = d.user_id WHERE u.role = 'doctor' AND d.id IS NULL"
        );

        for (const u of doctors) {
            console.log("Adding doctor record for: " + u.name);
            await pool.query(
                "INSERT INTO doctors (user_id, specialization, experience) VALUES (?, ?, ?)",
                [u.id, "General Physician", 5]
            );
        }

        // 2. Find patients without records
        const [patients] = await pool.query(
            "SELECT u.id, u.name FROM users u LEFT JOIN patients p ON u.id = p.user_id WHERE u.role = 'patient' AND p.id IS NULL"
        );

        for (const u of patients) {
            console.log("Adding patient record for: " + u.name);
            await pool.query("INSERT INTO patients (user_id) VALUES (?)", [u.id]);
        }

        console.log('DB fix completed.');
        process.exit(0);
    } catch (err) {
        console.error('Fix failed:', err);
        process.exit(1);
    }
};

fixData();
