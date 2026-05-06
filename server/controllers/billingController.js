const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create a new bill with items (consultation, medicines, lab tests)
exports.createBill = async (req, res) => {
    const { patient_id, total_amount, items } = req.body;
    try {
        // Insert bill
        const [result] = await pool.query(
            'INSERT INTO bills (patient_id, total_amount, status, created_at) VALUES (?, ?, ?, NOW())',
            [patient_id, total_amount, 'unpaid']
        );
        const billId = result.insertId;

        // Insert individual items
        for (let item of items) {
            await pool.query(
                'INSERT INTO bill_items (bill_id, description, amount) VALUES (?, ?, ?)',
                [billId, item.description, item.amount]
            );
        }

        res.status(201).json({ success: true, message: 'Bill generated', billId });
    } catch (err) {
        console.error('Create bill error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all bills (for admin/doctor view)
exports.getAllBills = async (req, res) => {
    try {
        const [bills] = await pool.query(`
            SELECT b.*, u.name as patient_name, u.email as patient_email
            FROM bills b
            JOIN patients p ON b.patient_id = p.id
            JOIN users u ON p.user_id = u.id
        `);
        res.json({ success: true, bills });
    } catch (err) {
        console.error('Get all bills error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Generate PDF invoice for a bill
exports.generatePDF = async (req, res) => {
    const { id } = req.params;
    console.log('🧾 PDF generation requested for bill ID:', id, 'User:', req.user?.id);
    
    try {
        console.log('📊 Fetching bill data...');
        const [bills] = await pool.query(`
            SELECT b.*, COALESCE(u.name, "Unknown Patient") as patient_name, COALESCE(u.email, "") as patient_email
            FROM bills b
            LEFT JOIN patients p ON b.patient_id = p.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE b.id = ?
        `, [id]);

        console.log('📋 Bill found:', bills.length > 0 ? `Yes, patient: ${bills[0].patient_name}` : 'No bill found');

        if (bills.length === 0) {
            console.log('❌ Bill not found');
            return res.status(404).json({ success: false, message: 'Bill not found' });
        }

        const bill = bills[0];
        console.log('🛒 Fetching bill items...');
        const [items] = await pool.query('SELECT * FROM bill_items WHERE bill_id = ?', [id]);
        console.log('📦 Bill items count:', items.length);

        // Simple reliable PDF layout - fixed positions
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filename = `invoice_${id}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        console.log('📄 Starting PDF generation - SIMPLE LAYOUT');
        
        // Title
        doc.fontSize(24).text('INVOICE', 50, 70);
        doc.fontSize(18).text(`#INV-${id.toString().padStart(4, '0')}`, 50, 100);
        
        // Bill info
        doc.fontSize(12)
           .text(`Date: ${new Date(bill.created_at).toLocaleDateString()}`, 50, 130)
           .text(`Patient: ${bill.patient_name}`, 50, 150)
           .text(`Email: ${bill.patient_email || 'N/A'}`, 50, 170)
           .text(`Bill ID: ${id}`, 50, 190);
        
        // Table header
        doc.fontSize(14).fillColor('#333')
           .text('Description', 50, 230)
           .text('Amount', 400, 230);
        
        doc.strokeColor('#ddd').lineWidth(1)
           .moveTo(50, 245).lineTo(550, 245).stroke();
        
        // Items table
        let yPos = 260;
        items.slice(0, 10).forEach(item => {  // Max 10 items
            doc.fontSize(11)
               .text(item.description.substring(0, 60), 50, yPos)
               .text(`$${parseFloat(item.amount || 0).toFixed(2)}`, 400, yPos, { align: 'right' });
            yPos += 25;
        });
        
        if (items.length === 0) {
            doc.text('(Consultation fee only)', 50, 260);
        }
        
        // Total
        doc.fillColor('#000').fontSize(16).font('Helvetica-Bold')
           .text(`Total: $${parseFloat(bill.total_amount || 0).toFixed(2)}`, 400, yPos + 20, { align: 'right' })
           .text(`Status: ${bill.status?.toUpperCase() || 'UNPAID'}`, 400, yPos + 45, { align: 'right' });
        
        console.log(`📦 Generated PDF: ${items.length} items, $${bill.total_amount} total`);
        doc.pipe(res);
        doc.end();
        
        console.log('✅ PDF streamed successfully');
    } catch (err) {
        console.error('❌ Generate PDF error:', err.message, err.stack);
        res.status(500).json({ success: false, message: 'PDF generation failed: ' + err.message });
    }
};

// Get bills for a specific patient
exports.getBillsByPatient = async (req, res) => {
    const { patient_id } = req.params;
    try {
        const [bills] = await pool.query('SELECT * FROM bills WHERE patient_id = ?', [patient_id]);
        res.json({ success: true, bills });
    } catch (err) {
        console.error('Get bills by patient error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Process payment for a bill
exports.processBillPayment = async (req, res) => {
    const { id } = req.params;
    const { amount, paymentMethod, reference } = req.body;

    try {
        const paymentAmount = Number(String(amount ?? '').replace(/,/g, '').trim());
        if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid payment amount' });
        }

        // Fetch current bill
        const [bills] = await pool.query('SELECT * FROM bills WHERE id = ?', [id]);
        if (bills.length === 0) return res.status(404).json({ success: false, message: 'Bill not found' });

        const bill = bills[0];
        const totalAmount = Number(String(bill.total_amount ?? 0).replace(/,/g, '').trim());
        const currentPaidAmount = Number(String(bill.paid_amount ?? 0).replace(/,/g, '').trim());
        if (!Number.isFinite(totalAmount) || !Number.isFinite(currentPaidAmount)) {
            return res.status(400).json({ success: false, message: 'Invalid bill totals in database' });
        }
        const newPaidAmount = Number((currentPaidAmount + paymentAmount).toFixed(2));
        const remainingAmount = Math.max(0, Number((totalAmount - newPaidAmount).toFixed(2)));
        const newStatus = remainingAmount <= 0 ? 'paid' : 'partial';

        // Update bill
        await pool.query(
            `UPDATE bills 
             SET paid_amount = ?, status = ?, last_payment_method = ?, last_payment_reference = ?, last_payment_date = NOW()
             WHERE id = ?`,
            [newPaidAmount, newStatus, paymentMethod, reference, id]
        );

        // Add payment record
        await pool.query(
            'INSERT INTO payments (bill_id, amount, payment_method, reference_number, payment_date) VALUES (?, ?, ?, ?, NOW())',
            [id, paymentAmount, paymentMethod, reference]
        );

        res.json({
            success: true,
            message: `Payment of $${paymentAmount.toFixed(2)} processed successfully`,
            bill: {
                id,
                paidAmount: newPaidAmount,
                status: newStatus,
                remainingAmount
            }
        });
    } catch (err) {
        console.error('Process bill payment error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get patient services breakdown for auto-billing (consultations, labs, meds)
exports.getPatientServices = async (req, res) => {
    const { patient_id } = req.params;
    try {
        // Consultation fees
        const [consultations] = await pool.query(`
            SELECT SUM(consultation_fee) as total, COUNT(*) as count 
            FROM appointments 
            WHERE patient_id = ? AND status = 'completed'
        `, [patient_id]);

        // Completed lab tests
        const [labs] = await pool.query(`
            SELECT test_name, cost, status 
            FROM lab_tests 
            WHERE patient_id = ? AND status = 'completed'
        `, [patient_id]);

        // Dispensed medicines
        const [meds] = await pool.query(`
            SELECT 
                m.name, 
                pmh.quantity, 
                pmh.quantity * m.price as total_cost,
                pr.created_at
            FROM patient_medicine_history pmh
            JOIN medicines m ON pmh.medicine_id = m.id
            JOIN prescriptions pr ON pmh.prescription_id = pr.id
            WHERE pmh.patient_id = ? AND pr.status = 'dispensed'
        `, [patient_id]);

        // Bill items already existing (to avoid double-charging)
        const [billItems] = await pool.query(`
            SELECT description, amount 
            FROM bill_items bi
            JOIN bills b ON bi.bill_id = b.id
            WHERE b.patient_id = ? AND b.status IN ('unpaid', 'partial')
        `, [patient_id]);

        const services = {
            consultations: {
                total: parseFloat(consultations[0]?.total || 0),
                count: consultations[0]?.count || 0
            },
            labs: labs.map(l => ({
                name: l.test_name,
                cost: parseFloat(l.cost)
            })),
            meds: meds.map(m => ({
                name: m.name,
                quantity: m.quantity,
                total: parseFloat(m.total_cost)
            })),
            existing_bill_items: billItems,
            grand_total: 0 // Frontend will sum
        };

        // Calculate grand_total excluding existing bills to suggest new charges
        services.grand_total = services.consultations.total;
        services.labs.forEach(l => services.grand_total += l.cost);
        services.meds.forEach(m => services.grand_total += m.total);

        res.json({ success: true, services });
    } catch (err) {
        console.error('Get patient services error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Adaptive billing timeline for a patient (charge and payment evolution)
exports.getPatientBillingTimeline = async (req, res) => {
    const { patient_id } = req.params;
    try {
        const events = [];

        const [patientRows] = await pool.query(`
            SELECT p.id, u.name as patient_name, u.email as patient_email
            FROM patients p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `, [patient_id]);
        if (patientRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const [billItems] = await pool.query(`
            SELECT bi.id, bi.bill_id, bi.description, bi.amount, b.created_at as created_at
            FROM bill_items bi
            JOIN bills b ON bi.bill_id = b.id
            WHERE b.patient_id = ?
            ORDER BY b.created_at ASC, bi.id ASC
        `, [patient_id]);

        const [payments] = await pool.query(`
            SELECT p.id, p.bill_id, p.amount, p.payment_method, p.reference_number, p.payment_date
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            WHERE b.patient_id = ?
            ORDER BY p.payment_date ASC, p.id ASC
        `, [patient_id]);

        const [admissions] = await pool.query(`
            SELECT id, stay_days, daily_room_rate, processed_at
            FROM admission_requests
            WHERE patient_id = ? AND status = 'approved'
            ORDER BY processed_at ASC
        `, [patient_id]);

        const [consultations] = await pool.query(`
            SELECT id, consultation_fee, appointment_date
            FROM appointments
            WHERE patient_id = ? AND consultation_fee > 0
            ORDER BY appointment_date ASC
        `, [patient_id]);

        consultations.forEach((c) => {
            events.push({
                type: 'consultation',
                ts: c.appointment_date,
                title: 'Consultation completed',
                description: `Consultation fee recorded`,
                amount_delta: Number(c.consultation_fee || 0),
                ref: `APPT-${c.id}`
            });
        });

        admissions.forEach((a) => {
            const expectedRoomCharge = Number(a.stay_days || 0) * Number(a.daily_room_rate || 0);
            events.push({
                type: 'admission',
                ts: a.processed_at,
                title: 'Inpatient admission processed',
                description: `${a.stay_days} day(s) @ ${Number(a.daily_room_rate || 0).toFixed(2)}/day`,
                amount_delta: Number(expectedRoomCharge.toFixed(2)),
                ref: `ADM-${a.id}`
            });
        });

        billItems.forEach((item) => {
            events.push({
                type: 'charge',
                ts: item.created_at,
                title: 'Charge added',
                description: item.description,
                amount_delta: Number(item.amount || 0),
                ref: `BILL-${item.bill_id}`
            });
        });

        payments.forEach((pay) => {
            events.push({
                type: 'payment',
                ts: pay.payment_date,
                title: 'Payment received',
                description: `${(pay.payment_method || 'unknown').toUpperCase()}${pay.reference_number ? ` | Ref: ${pay.reference_number}` : ''}`,
                amount_delta: -Number(pay.amount || 0),
                ref: `PAY-${pay.id}`
            });
        });

        events.sort((a, b) => new Date(a.ts) - new Date(b.ts));

        let runningBalance = 0;
        const timeline = events.map((event) => {
            runningBalance += Number(event.amount_delta || 0);
            return {
                ...event,
                running_balance: Number(runningBalance.toFixed(2))
            };
        });

        const [latestBill] = await pool.query(
            'SELECT id, total_amount, paid_amount, status, created_at FROM bills WHERE patient_id = ? ORDER BY id DESC LIMIT 1',
            [patient_id]
        );

        res.json({
            success: true,
            patient: patientRows[0],
            summary: latestBill[0] || null,
            timeline
        });
    } catch (err) {
        console.error('getPatientBillingTimeline error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

