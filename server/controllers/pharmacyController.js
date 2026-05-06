const pool = require('../config/db');

// Get all medicines
exports.getAllMedicines = async (req, res) => {
    try {
        const [medicines] = await pool.query('SELECT * FROM medicines ORDER BY name ASC');
        res.json({ success: true, medicines });
    } catch (err) {
        console.error('Get all medicines error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get medicine by ID
exports.getMedicineById = async (req, res) => {
    const { id } = req.params;
    try {
        const [medicines] = await pool.query('SELECT * FROM medicines WHERE id = ?', [id]);
        if (medicines.length === 0) {
            return res.status(404).json({ success: false, message: 'Medicine not found' });
        }
        res.json({ success: true, medicine: medicines[0] });
    } catch (err) {
        console.error('Get medicine by ID error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Add new medicine
exports.addMedicine = async (req, res) => {
    const { name, stock, price, expiry_date } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO medicines (name, stock, price, expiry_date) VALUES (?, ?, ?, ?)',
            [name, stock, price, expiry_date]
        );
        res.status(201).json({ 
            success: true, 
            message: 'Medicine added successfully',
            medicineId: result.insertId
        });
    } catch (err) {
        console.error('Add medicine error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update medicine stock
exports.updateStock = async (req, res) => {
    const { id } = req.params;
    const { stock } = req.body;
    try {
        const [medicines] = await pool.query('SELECT * FROM medicines WHERE id = ?', [id]);
        if (medicines.length === 0) {
            return res.status(404).json({ success: false, message: 'Medicine not found' });
        }

        await pool.query('UPDATE medicines SET stock = ? WHERE id = ?', [stock, id]);
        res.json({ success: true, message: 'Stock updated successfully' });
    } catch (err) {
        console.error('Update stock error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update medicine details
exports.updateMedicine = async (req, res) => {
    const { id } = req.params;
    const { name, stock, price, expiry_date } = req.body;
    try {
        const [medicines] = await pool.query('SELECT * FROM medicines WHERE id = ?', [id]);
        if (medicines.length === 0) {
            return res.status(404).json({ success: false, message: 'Medicine not found' });
        }

        await pool.query(
            'UPDATE medicines SET name = ?, stock = ?, price = ?, expiry_date = ? WHERE id = ?',
            [name, stock, price, expiry_date, id]
        );
        res.json({ success: true, message: 'Medicine updated successfully' });
    } catch (err) {
        console.error('Update medicine error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete medicine
exports.deleteMedicine = async (req, res) => {
    const { id } = req.params;
    try {
        const [medicines] = await pool.query('SELECT * FROM medicines WHERE id = ?', [id]);
        if (medicines.length === 0) {
            return res.status(404).json({ success: false, message: 'Medicine not found' });
        }

        await pool.query('DELETE FROM medicines WHERE id = ?', [id]);
        res.json({ success: true, message: 'Medicine deleted successfully' });
    } catch (err) {
        console.error('Delete medicine error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Issue medicine to patient (from pharmacy)
exports.issueMedicineToPatient = async (req, res) => {
    const { patient_id, medicine_id, quantity, notes } = req.body;
    const pharmacist_user_id = req.user.id;

    try {
        // Verify patient exists
        const [patients] = await pool.query('SELECT * FROM patients WHERE id = ?', [patient_id]);
        if (patients.length === 0) return res.status(404).json({ success: false, message: 'Patient not found' });

        // Verify medicine exists & stock
        const [medicines] = await pool.query('SELECT * FROM medicines WHERE id = ?', [medicine_id]);
        if (medicines.length === 0) return res.status(404).json({ success: false, message: 'Medicine not found' });

        if (medicines[0].stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });

        // Deduct stock
        await pool.query('UPDATE medicines SET stock = stock - ? WHERE id = ?', [quantity, medicine_id]);

        // Record issuance in patient history
        await pool.query(`
            INSERT INTO patient_medicine_history 
            (patient_id, medicine_id, quantity, issued_by_user_id, instructions, issued_at) 
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [patient_id, medicine_id, quantity, pharmacist_user_id, notes]);

        res.json({ success: true, message: 'Medicine issued to patient successfully' });
    } catch (err) {
        console.error('Issue medicine error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get medicines low on stock
exports.getLowStockMedicines = async (req, res) => {
    const { threshold } = req.query;
    const stockThreshold = threshold || 10;

    try {
        const [medicines] = await pool.query(
            'SELECT * FROM medicines WHERE stock <= ? ORDER BY stock ASC',
            [stockThreshold]
        );
        res.json({ success: true, medicines, threshold: stockThreshold });
    } catch (err) {
        console.error('Low stock medicines error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get medicine usage statistics
exports.getMedicineUsageStats = async (req, res) => {
    try {
        const [usage] = await pool.query(`
            SELECT m.id, m.name, m.stock, m.price,
                   COUNT(pmh.id) as times_issued,
                   SUM(pmh.quantity) as total_quantity_issued,
                   (m.price * SUM(pmh.quantity)) as total_value
            FROM medicines m
            LEFT JOIN patient_medicine_history pmh ON m.id = pmh.medicine_id
            GROUP BY m.id
            ORDER BY times_issued DESC
        `);

        res.json({ success: true, usage });
    } catch (err) {
        console.error('Medicine usage stats error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};