const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
    const name = 'System Admin';
    const email = 'admin@hms.com';
    const password = 'admin1234';
    const role = 'admin';

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role]
        );

        console.log('Admin user created successfully!');
        console.log('Email: ' + email);
        console.log('Password: ' + password);
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            console.log('Admin user already exists.');
        } else {
            console.error('Error creating admin:', err.message);
        }
        process.exit(1);
    }
};

createAdmin();
