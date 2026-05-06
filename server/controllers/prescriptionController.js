const pool = require('../config/db');

const parsePrescriptionMedicines = (medicinesRaw) => {
    if (!medicinesRaw) return [];
    try {
        const parsed = Array.isArray(medicinesRaw)
            ? medicinesRaw
            : (typeof medicinesRaw === 'string' ? JSON.parse(medicinesRaw) : []);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((item) => ({
                ...item,
                id: Number(item?.id ?? item?.medicine_id)
            }))
            .filter((item) => Number.isInteger(item.id) && item.id > 0);
    } catch (error) {
        return [];
    }
};

const hasDispensableMedicine = (prescription) => {
    if (prescription?.medicine_id) return true;
    return parsePrescriptionMedicines(prescription?.medicines).length > 0;
};

const LAB_TEST_MAP = {
    blood: { name: 'Blood Test', category: 'blood', cost: 200 },
    urine: { name: 'Urine Analysis', category: 'urine', cost: 150 },
    xray: { name: 'X-Ray', category: 'xray', cost: 500 },
    mri: { name: 'MRI Scan', category: 'mri', cost: 2000 },
    ct_scan: { name: 'CT Scan', category: 'ct_scan', cost: 1500 },
    ecg: { name: 'ECG Test', category: 'ecg', cost: 300 },
    ultrasound: { name: 'Ultrasound', category: 'ultrasound', cost: 800 },
    biopsy: { name: 'Biopsy', category: 'biopsy', cost: 1000 }
};

const getDoctorByUserId = async (doctorUserId) => {
    const [doctors] = await pool.query('SELECT id FROM doctors WHERE user_id = ?', [doctorUserId]);
    return doctors[0] || null;
};

const createLabTestsForPatient = async ({ patient_id, doctor_id, doctor_user_id, lab_test_ids }) => {
    if (!Array.isArray(lab_test_ids) || lab_test_ids.length === 0) return;
    for (const test_id of lab_test_ids) {
        const testInfo = LAB_TEST_MAP[test_id] || { name: test_id, category: 'other', cost: 250 };
        await pool.query(
            'INSERT INTO lab_tests (patient_id, doctor_id, test_name, test_category, status, requested_by_user_id, cost) VALUES (?, ?, ?, ?, "requested", ?, ?)',
            [patient_id, doctor_id, testInfo.name, testInfo.category, doctor_user_id, testInfo.cost]
        );
    }
};

exports.createPrescription = async (req, res) => {
const { patient_id, medicines, medicine_id, dosage, instructions, lab_test_ids, consultation_fee, admit_patient, stay_days, appointment_id } = req.body;
    const doctor_user_id = req.user.id;

    try {
        const doctor = await getDoctorByUserId(doctor_user_id);
        if (!doctor) {
            return res.status(403).json({ success: false, message: 'Only registered doctors can prescribe' });
        }
        const doctor_id = doctor.id;

    let prescription_id = null;

        // Create prescription record (always, even if no meds - for consultation)
        const medicines_array = medicines && Array.isArray(medicines) ? medicines : (medicine_id ? [{id: parseInt(medicine_id), quantity: 1, dosage: dosage || '', instructions: instructions || ''}] : []);
        const medicines_json = medicines_array.length > 0 ? JSON.stringify(medicines_array) : null;

        const [result] = await pool.query(
            'INSERT INTO prescriptions (patient_id, doctor_id, medicine_id, medicines, dosage, instructions) VALUES (?, ?, ?, ?, ?, ?)',
            [patient_id, doctor_id, medicine_id || null, medicines_json, dosage || null, instructions || null]
        );
        prescription_id = result.insertId;

        let effectiveLabTestIds = Array.isArray(lab_test_ids) ? lab_test_ids.map(String) : [];
        let pendingFromAppointmentIds = [];
        if (appointment_id) {
            const [appointments] = await pool.query('SELECT pending_lab_test_ids FROM appointments WHERE id = ?', [appointment_id]);
            const pendingFromAppointment = appointments[0]?.pending_lab_test_ids;
            if (Array.isArray(pendingFromAppointment)) {
                pendingFromAppointmentIds = pendingFromAppointment.map(String);
            } else if (typeof pendingFromAppointment === 'string' && pendingFromAppointment.trim()) {
                try {
                    const parsed = JSON.parse(pendingFromAppointment);
                    if (Array.isArray(parsed)) pendingFromAppointmentIds = parsed.map(String);
                } catch (e) {
                    // ignore malformed previous values
                }
            }
        }

        if (appointment_id) {
            effectiveLabTestIds = effectiveLabTestIds.length > 0
                ? [...new Set([...pendingFromAppointmentIds, ...effectiveLabTestIds])]
                : pendingFromAppointmentIds;
        }

        const labTestsToCreate = appointment_id
            ? effectiveLabTestIds.filter((id) => !pendingFromAppointmentIds.includes(id))
            : effectiveLabTestIds;

        if (labTestsToCreate.length > 0) {
            await createLabTestsForPatient({ patient_id, doctor_id, doctor_user_id, lab_test_ids: labTestsToCreate });
            await pool.query(
                'UPDATE patient_flow_tracking SET status = "lab_test" WHERE patient_id = ? AND check_out_time IS NULL',
                [patient_id]
            );
        }

        // Auto billing logic for medicine and lab tests
        let additionalItems = [];
        let additionalTotal = 0.0;

// Medicines cost (multi or single)
        if (medicines_json) {
            const medicinesParsed = JSON.parse(medicines_json);
            for (const medItem of medicinesParsed) {
                const [meds] = await pool.query('SELECT name, price FROM medicines WHERE id = ?', [medItem.id]);
                if (meds.length > 0) {
                    const medCost = parseFloat(meds[0].price) * (medItem.quantity || 1);
                    additionalItems.push({
                        desc: `Medicine: ${meds[0].name} (${medItem.dosage || 'as prescribed'}, Qty: ${medItem.quantity || 1})`,
                        amt: medCost
                    });
                    additionalTotal += medCost;
                }
            }
        }

        // Lab tests costs
        if (Array.isArray(effectiveLabTestIds) && effectiveLabTestIds.length > 0) {
            for (const test_id of effectiveLabTestIds) {
                const testInfo = LAB_TEST_MAP[test_id] || { name: String(test_id).replace('_', ' ').toUpperCase(), cost: 250 };
                additionalItems.push({
                    desc: `Lab Test: ${testInfo.name}`,
                    amt: testInfo.cost
                });
                additionalTotal += testInfo.cost;
            }
        }

        const consultationFee = Number(consultation_fee || 500);

        // Update appointment with consultation fee and mark completed
        if (appointment_id) {
            await pool.query(
                'UPDATE appointments SET consultation_fee = ?, status = "completed" WHERE id = ?',
                [consultationFee, appointment_id]
            );
        }

        // Auto-create/append to bill for doctor consultation charge
        if (consultationFee > 0) {
            const [doctorUser] = await pool.query(
                `SELECT u.name as doctor_name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?`,
                [doctor_id]
            );
            const doctorName = doctorUser.length > 0 ? doctorUser[0].doctor_name : 'Doctor';

            const [existingBills] = await pool.query(
                'SELECT * FROM bills WHERE patient_id = ? AND status IN ("unpaid", "partial") ORDER BY created_at DESC LIMIT 1',
                [patient_id]
            );

            let billId;
            if (existingBills.length > 0) {
                billId = existingBills[0].id;
                const currentTotal = parseFloat(existingBills[0]?.total_amount || 0);
                const currentPaid = parseFloat(existingBills[0]?.paid_amount || 0);
                const newTotal = currentTotal + consultationFee + additionalTotal;
                const newStatus = currentPaid >= newTotal ? 'paid' : (currentPaid > 0 ? 'partial' : 'unpaid');

                await pool.query('UPDATE bills SET total_amount = ?, status = ? WHERE id = ?', [newTotal, newStatus, billId]);
            } else {
                const [newBillResult] = await pool.query(
                    'INSERT INTO bills (patient_id, total_amount, paid_amount, status) VALUES (?, ?, 0, "unpaid")',
                    [patient_id, consultationFee + additionalTotal]
                );
                billId = newBillResult.insertId;
            }

            await pool.query(
                'INSERT INTO bill_items (bill_id, description, amount) VALUES (?, ?, ?)',
                [billId, `Consultation fee with Dr. ${doctorName}`, consultationFee]
            );

            // Insert additional bill items for medicine and labs
            for (const item of additionalItems) {
                await pool.query(
                    'INSERT INTO bill_items (bill_id, description, amount) VALUES (?, ?, ?)',
                    [billId, item.desc, item.amt]
                );
            }
        }
        let admissionRequested = false;
        if (admit_patient) {
            const stayDaysNum = Number(stay_days);
            if (Number.isInteger(stayDaysNum) && stayDaysNum > 0) {
                await pool.query(
                    `INSERT INTO admission_requests
                     (patient_id, doctor_id, requested_by_user_id, appointment_id, prescription_id, stay_days, daily_room_rate, notes, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`, 
                    [
                        patient_id,
                        doctor_id,
                        doctor_user_id,
                        appointment_id || null,
                        prescription_id,
                        stayDaysNum,
                        Number(process.env.INPATIENT_ROOM_DAILY_RATE || 1000),
                        'Doctor requested admission'
                    ]
                );
                admissionRequested = true;
            }
        }

        if (appointment_id) {
            await pool.query('UPDATE appointments SET pending_lab_test_ids = NULL WHERE id = ?', [appointment_id]);
        }

        res.status(201).json({
            success: true,
            message: `Consultation completed! Invoice updated: Rs.${consultationFee + additionalTotal}`,
            prescription_id,
            consultation_fee: consultationFee,
            additional_charges: additionalTotal,
            lab_tests_requested: Array.isArray(effectiveLabTestIds) ? effectiveLabTestIds.length : 0,
            admission_requested: admissionRequested
        });
    } catch (err) {
        console.error('Prescription error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.markPatientWaitingForLab = async (req, res) => {
    const { patient_id, lab_test_ids, appointment_id } = req.body;
    const doctor_user_id = req.user.id;

    try {
        const doctor = await getDoctorByUserId(doctor_user_id);
        if (!doctor) {
            return res.status(403).json({ success: false, message: 'Only registered doctors can request lab tests' });
        }
        if (!Array.isArray(lab_test_ids) || lab_test_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Select at least one lab test before moving patient to waiting' });
        }

        let existingPending = [];
        if (appointment_id) {
            const [appointments] = await pool.query('SELECT pending_lab_test_ids FROM appointments WHERE id = ?', [appointment_id]);
            const pending = appointments[0]?.pending_lab_test_ids;
            if (Array.isArray(pending)) {
                existingPending = pending;
            } else if (typeof pending === 'string' && pending.trim()) {
                try {
                    const parsed = JSON.parse(pending);
                    if (Array.isArray(parsed)) existingPending = parsed;
                } catch (e) {
                    // ignore
                }
            }
        }

        const mergedLabTests = [...new Set([...(existingPending || []), ...lab_test_ids])];
        const newLabTestsToCreate = mergedLabTests.filter((id) => !existingPending.includes(id));

        await createLabTestsForPatient({
            patient_id,
            doctor_id: doctor.id,
            doctor_user_id,
            lab_test_ids: newLabTestsToCreate
        });

        if (appointment_id) {
            await pool.query(
                'UPDATE appointments SET pending_lab_test_ids = ? WHERE id = ?',
                [JSON.stringify(mergedLabTests), appointment_id]
            );
        }

        await pool.query(
            'UPDATE patient_flow_tracking SET status = "waiting" WHERE patient_id = ? AND check_out_time IS NULL',
            [patient_id]
        );

        if (appointment_id) {
            await pool.query('UPDATE appointments SET status = "approved" WHERE id = ?', [appointment_id]);
        }

        res.json({
            success: true,
            message: 'Patient moved to waiting. Lab tests sent to lab queue.',
            data: { patient_id, lab_tests_requested: mergedLabTests.length }
        });
    } catch (err) {
        console.error('markPatientWaitingForLab error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPrescriptions = async (req, res) => {
    try {
        const [prescriptions] = await pool.query(`
            SELECT pr.*, p.name as patient_name, u.name as doctor_name, m.name as medicine_name, m.stock
            FROM prescriptions pr
            JOIN patients pt ON pr.patient_id = pt.id
            JOIN users p ON pt.user_id = p.id
            JOIN doctors d ON pr.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            LEFT JOIN medicines m ON pr.medicine_id = m.id
            WHERE pr.status = 'pending'
              AND (
                pr.medicine_id IS NOT NULL
                OR (pr.medicines IS NOT NULL AND pr.medicines <> '' AND pr.medicines <> '[]')
              )
            ORDER BY pr.created_at DESC
        `);
        const filteredPrescriptions = prescriptions.filter(hasDispensableMedicine);
        res.json({ success: true, prescriptions: filteredPrescriptions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPrescriptionById = async (req, res) => {
    const { id } = req.params;
    try {
        const [prescriptions] = await pool.query(`
            SELECT pr.*, p.name as patient_name, u.name as doctor_name, m.name as medicine_name, m.stock, m.price
            FROM prescriptions pr
            JOIN patients pt ON pr.patient_id = pt.id
            JOIN users p ON pt.user_id = p.id
            JOIN doctors d ON pr.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            LEFT JOIN medicines m ON pr.medicine_id = m.id
            WHERE pr.id = ?
        `, [id]);
        
        if (prescriptions.length === 0) {
            return res.status(404).json({ success: false, message: 'Prescription not found' });
        }
        
        res.json({ success: true, prescription: prescriptions[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.dispensePrescription = async (req, res) => {
    const { id } = req.params;
    const pharmacist_user_id = req.user.id;
    const quantity = req.body?.quantity || 1;

    try {
        // 1. Get prescription details
        const [prescriptions] = await pool.query('SELECT * FROM prescriptions WHERE id = ?', [id]);
        if (prescriptions.length === 0) {
            return res.status(404).json({ success: false, message: 'Prescription not found' });
        }
        const pr = prescriptions[0];

        if (pr.status === 'dispensed') {
            return res.status(400).json({ success: false, message: 'Prescription already dispensed' });
        }

        // 2. Handle multi/single medicines
        let dispensedQtyTotal = 0;
        if (pr.medicines) {
            const medicinesParsed = parsePrescriptionMedicines(pr.medicines);

            for (const medItem of medicinesParsed) {
                const medId = Number(medItem.id);
                if (!medId) {
                    continue;
                }
                const medQty = medItem.quantity || 1;
                const [medStock] = await pool.query('SELECT stock, name FROM medicines WHERE id = ?', [medId]);
                if (medStock.length === 0) {
                    return res.status(404).json({ success: false, message: `Medicine ${medId} not found` });
                }
                if (medStock[0].stock < medQty) {
                    return res.status(400).json({ success: false, message: `Insufficient stock for ${medStock[0].name}` });
                }
                // Update stock
                await pool.query('UPDATE medicines SET stock = stock - ? WHERE id = ?', [medQty, medId]);
                // History
                await pool.query(`
                    INSERT INTO patient_medicine_history 
                    (patient_id, medicine_id, quantity, dosage, instructions, issued_by_user_id, prescription_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [pr.patient_id, medId, medQty, medItem.dosage || pr.dosage, medItem.instructions || pr.instructions, pharmacist_user_id, id]);
                dispensedQtyTotal += medQty;
            }
        }

        if (dispensedQtyTotal === 0 && pr.medicine_id) {
            // Legacy single
            const [medStock] = await pool.query('SELECT stock FROM medicines WHERE id = ?', [pr.medicine_id]);
            if (medStock.length === 0) {
                return res.status(404).json({ success: false, message: 'Medicine not found' });
            }
            const medQty = quantity || 1;
            if (medStock[0].stock < medQty) {
                return res.status(400).json({ success: false, message: 'Insufficient stock' });
            }
            await pool.query('UPDATE medicines SET stock = stock - ? WHERE id = ?', [medQty, pr.medicine_id]);
            await pool.query(`
                INSERT INTO patient_medicine_history 
                (patient_id, medicine_id, quantity, dosage, instructions, issued_by_user_id, prescription_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [pr.patient_id, pr.medicine_id, medQty, pr.dosage, pr.instructions, pharmacist_user_id, id]);
            dispensedQtyTotal = medQty;
        } else if (dispensedQtyTotal === 0) {
            return res.status(400).json({ success: false, message: 'No medicines in prescription' });
        }

        // Update prescription status
        await pool.query("UPDATE prescriptions SET status = 'dispensed' WHERE id = ?", [id]);

        // 6. Update patient flow tracking - mark as pharmacy completed (if exists, don't error if not)
        try {
            await pool.query(`
                UPDATE patient_flow_tracking 
                SET status = 'checked_out', check_out_time = NOW(), 
                    duration_minutes = TIMESTAMPDIFF(MINUTE, check_in_time, NOW())
                WHERE patient_id = ? AND check_out_time IS NULL
            `, [pr.patient_id]);
        } catch (flowErr) {
            console.warn('Could not update patient flow tracking:', flowErr);
        }

        res.json({ 
            success: true, 
            message: `Medicines dispensed successfully (total qty: ${dispensedQtyTotal})`,
            data: {
                prescription_id: id,
                quantity_dispensed: dispensedQtyTotal
            }
        });
    } catch (err) {
        console.error('Error in dispensePrescription:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPrescriptionsByPatient = async (req, res) => {
    const { patient_id } = req.params;
    try {
        const [prescriptions] = await pool.query(`
            SELECT pr.*, m.name as medicine_name, m.price, d.id as doctor_id, u.name as doctor_name
            FROM prescriptions pr
            LEFT JOIN medicines m ON pr.medicine_id = m.id
            JOIN doctors d ON pr.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            WHERE pr.patient_id = ?
            ORDER BY pr.created_at DESC
        `, [patient_id]);
        
        res.json({ success: true, prescriptions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPendingPrescriptions = async (req, res) => {
    try {
        const [prescriptions] = await pool.query(`
            SELECT pr.*, p.name as patient_name, u.name as doctor_name, m.name as medicine_name, m.stock
            FROM prescriptions pr
            JOIN patients pt ON pr.patient_id = pt.id
            JOIN users p ON pt.user_id = p.id
            JOIN doctors d ON pr.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            LEFT JOIN medicines m ON pr.medicine_id = m.id
            WHERE pr.status = 'pending'
              AND (
                pr.medicine_id IS NOT NULL
                OR (pr.medicines IS NOT NULL AND pr.medicines <> '' AND pr.medicines <> '[]')
              )
            ORDER BY pr.created_at ASC
        `);
        const filteredPrescriptions = prescriptions.filter(hasDispensableMedicine);
        res.json({ success: true, prescriptions: filteredPrescriptions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.cancelPrescription = async (req, res) => {
    const { id } = req.params;
    try {
        const [prescriptions] = await pool.query('SELECT * FROM prescriptions WHERE id = ?', [id]);
        if (prescriptions.length === 0) {
            return res.status(404).json({ success: false, message: 'Prescription not found' });
        }

        if (prescriptions[0].status === 'dispensed') {
            return res.status(400).json({ success: false, message: 'Cannot cancel a dispensed prescription' });
        }

        await pool.query("UPDATE prescriptions SET status = 'cancelled' WHERE id = ?", [id]);
        res.json({ success: true, message: 'Prescription cancelled successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

