const pool = require('./config/db');

const diagnostic = async () => {
    try {
        const [users] = await pool.query('SELECT id, name, email, role FROM users');
        const [doctors] = await pool.query('SELECT id, user_id, department_id, specialization FROM doctors');
        const [patients] = await pool.query('SELECT id, user_id FROM patients');

        console.log('--- ALL USERS ---');
        users.forEach(u => console.log(`ID: ${u.id}, Name: ${u.name}, Role: ${u.role}`));

        console.log('\n--- DOCTORS MAPPING ---');
        doctors.forEach(d => {
            const user = users.find(u => u.id === d.user_id);
            console.log(`DoctorID: ${d.id}, UserID: ${d.user_id}, Name: ${user ? user.name : 'UNKNOWN'}`);
        });

        console.log('\n--- PATIENTS MAPPING ---');
        patients.forEach(p => {
            const user = users.find(u => u.id === p.user_id);
            console.log(`PatientID: ${p.id}, UserID: ${p.user_id}, Name: ${user ? user.name : 'UNKNOWN'}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Diagnostic failed:', err);
        process.exit(1);
    }
};

diagnostic();
