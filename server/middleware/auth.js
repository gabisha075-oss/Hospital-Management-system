// auth.js - Add console.logs for debugging
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    console.log('🔑 Auth Header:', authHeader); // 👈 DEBUG
    
    const token = authHeader?.split(' ')[1];
    console.log('🧩 Token:', token ? '✅ Found' : '❌ Missing'); // 👈 DEBUG

    if (!token) {
        console.log('🚫 No token provided');
        return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ User decoded:', decoded); // 👈 DEBUG
        req.user = decoded;
        next();
    } catch (err) {
        console.log('❌ Token verification failed:', err.message);
        res.status(401).json({ success: false, message: 'Token is not valid' });
    }
};

const roleMiddleware = (roles) => {
    return (req, res, next) => {
        console.log('🎭 Checking role:', req.user.role, 'Required:', roles); // 👈 DEBUG
        
        if (!roles.includes(req.user.role)) {
            console.log('🚫 Role denied');
            return res.status(403).json({
                success: false,
                message: `Role ${req.user.role} is not authorized to access this resource`
            });
        }
        next();
    };
};

module.exports = { authMiddleware, roleMiddleware };