import jwt from 'jsonwebtoken';

const secret = 'your_secret_key_here';
const token = jwt.sign({ id: 2, role: 'doctor' }, secret);
console.log('Token:', token);
