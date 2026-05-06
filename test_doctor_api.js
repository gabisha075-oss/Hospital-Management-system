const axios = require('axios');
const jwt = require('jsonwebtoken');

// Create a test token for a doctor user (id=2)
const testToken = jwt.sign(
    { id: 2, role: 'doctor', name: 'Dr. Arun Kumar' },
    'your_super_secret_jwt_key_12345'
);

console.log('Test Token:', testToken);

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Authorization': `Bearer ${testToken}`
    }
});

async function testDoctorAppointments() {
    try {
        console.log('\n=== Testing Doctor Appointments Endpoint ===');
        const response = await api.get('/appointments/doctor/appointments');
        console.log('Success! Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

async function testDoctorPatients() {
    try {
        console.log('\n=== Testing Doctor Patients Endpoint ===');
        const response = await api.get('/appointments/doctor/patients');
        console.log('Success! Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

(async () => {
    await testDoctorAppointments();
    await testDoctorPatients();
    process.exit(0);
})();
