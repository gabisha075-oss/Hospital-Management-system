import { useEffect, useState } from 'react';
import api from '../services/api';
import { Calendar, User, Clock, CheckCircle, XCircle, Pill, Plus, Send, Users, Beaker } from 'lucide-react';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';

const INITIAL_PRESCRIPTION_FORM = {
    medicine_id: '',
    dosage: '',
    instructions: '',
    lab_test_ids: [],
    consultation_fee: '500',
    admit_patient: false,
    stay_days: ''
};

const LAB_TEST_CATEGORY_MAP = {
    blood: 'blood',
    urine: 'urine',
    xray: 'xray',
    mri: 'mri',
    ct_scan: 'ct_scan',
    ecg: 'ecg',
    ultrasound: 'ultrasound',
    biopsy: 'biopsy'
};

const DoctorDashboard = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('appointments');
    const [appointments, setAppointments] = useState([]);
    const [patients, setPatients] = useState([]);
    const [patientReports, setPatientReports] = useState([]);
    const [selectedPatientForReports, setSelectedPatientForReports] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [labTests, setLabTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [prescriptionForm, setPrescriptionForm] = useState(INITIAL_PRESCRIPTION_FORM);
    const [medicinesSelected, setMedicinesSelected] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isDirectConsultation, setIsDirectConsultation] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [lockedLabTestIds, setLockedLabTestIds] = useState([]);
    const [returnLabHighlights, setReturnLabHighlights] = useState([]);
    const [lastPrescriptionTemplate, setLastPrescriptionTemplate] = useState(null);
    const [loadingReturnSmartPack, setLoadingReturnSmartPack] = useState(false);

    useEffect(() => {
        if (location.pathname.includes('/doctor/patients')) {
            setActiveTab('patients');
        } else if (location.pathname.includes('/doctor/appointments') || location.pathname === '/doctor') {
            setActiveTab('appointments');
        }
    }, [location.pathname]);

    useEffect(() => {
        const loadData = async () => {
            if (activeTab === 'appointments') {
                await fetchAppointments();
            } else if (activeTab === 'patients') {
                await fetchPatients();
            } else if (activeTab === 'labreports') {
                if (selectedPatientForReports) {
                    await fetchPatientReports(selectedPatientForReports);
                }
                await fetchPatients();
            }
            await Promise.allSettled([fetchMedicines(), fetchLabTests()]);
        };
        loadData();
    }, [activeTab, selectedPatientForReports]);



    const fetchAppointments = async () => {
        try {
            const res = await api.get('/appointments/doctor/appointments');
            setAppointments(res.data.appointments);
        } catch (err) {
            console.error('Appointments error:', err.response?.data || err.message);
            toast.error(err.response?.data?.message || 'Failed to fetch appointments');
        } finally {
            setLoading(false);
        }
    };

    const fetchPatients = async (search = '') => {
        try {
            const url = `/appointments/doctor/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`;
            const res = await api.get(url);
            setPatients(res.data.patients);
        } catch (err) {
            console.error('Patients error:', err.response?.data || err.message);
            toast.error(err.response?.data?.message || 'Failed to fetch patients');
        } finally {
            setLoading(false);
        }
    };

    const fetchMedicines = async () => {
        try {
            const res = await api.get('/pharmacy/medicines');
            setMedicines(res.data.medicines);
        } catch (err) {
            console.error('Failed to load medicines');
        }
    };

    const fetchLabTests = async () => {
        try {
            const res = await api.get('/lab-tests/templates/available');
            setLabTests(res.data.tests || []);
        } catch (err) {
            console.error('Failed to load lab tests');
        }
    };

    const fetchPatientReports = async (patientId) => {
        if (!patientId) return;
        try {
            const res = await api.get(`/lab/patient/${patientId}`);
            setPatientReports(res.data.reports || []);
        } catch (err) {
            console.error('Failed to load patient lab reports', err);
            toast.error('Failed to load lab reports for selected patient');
            setPatientReports([]);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await api.patch(`/appointments/${id}/status`, { status });
            toast.success(`Appointment ${status}`);
            fetchAppointments();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const claimWalkinAppointment = async (appointmentId) => {
        try {
            await api.patch(`/appointments/${appointmentId}/claim`);
            toast.success('Walk-in patient moved to your consultation queue');
            fetchAppointments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to claim walk-in appointment');
        }
    };

    const parsePersistedLabTestIds = (rawValue) => {
        if (Array.isArray(rawValue)) return rawValue.map(String);
        if (typeof rawValue === 'string' && rawValue.trim()) {
            try {
                const parsed = JSON.parse(rawValue);
                return Array.isArray(parsed) ? parsed.map(String) : [];
            } catch (err) {
                return [];
            }
        }
        return [];
    };

    const resetPrescriptionContext = () => {
        setShowPrescriptionModal(false);
        setSelectedPatient(null);
        setSelectedAppointment(null);
        setIsDirectConsultation(false);
        setPrescriptionForm(INITIAL_PRESCRIPTION_FORM);
        setMedicinesSelected([]);
        setLockedLabTestIds([]);
        setReturnLabHighlights([]);
        setLastPrescriptionTemplate(null);
        setLoadingReturnSmartPack(false);
    };

    const parsePrescriptionMedicines = (medicinesRaw) => {
        if (!medicinesRaw) return [];
        try {
            const parsed = Array.isArray(medicinesRaw)
                ? medicinesRaw
                : (typeof medicinesRaw === 'string' ? JSON.parse(medicinesRaw) : []);
            if (!Array.isArray(parsed)) return [];
            return parsed
                .map((m) => ({
                    id: Number(m.id || m.medicine_id),
                    quantity: Number(m.quantity || 1),
                    dosage: m.dosage || '',
                    instructions: m.instructions || ''
                }))
                .filter((m) => Number.isInteger(m.id) && m.id > 0);
        } catch {
            return [];
        }
    };

    const loadReturnConsultSmartPack = async (patientId, persistedLabTests = []) => {
        if (!patientId) return;
        setLoadingReturnSmartPack(true);
        try {
            const [completedLabRes, priorPrescriptionsRes] = await Promise.allSettled([
                api.get(`/lab-tests/patient/${patientId}/completed`),
                api.get(`/prescriptions/patient/${patientId}`)
            ]);

            const lockedCategories = persistedLabTests
                .map((id) => LAB_TEST_CATEGORY_MAP[String(id)] || String(id))
                .filter(Boolean);

            if (completedLabRes.status === 'fulfilled') {
                const completed = completedLabRes.value.data?.tests || [];
                const matching = completed.filter((test) =>
                    lockedCategories.includes(String(test.test_category || '').toLowerCase())
                );
                setReturnLabHighlights(matching);
            } else {
                setReturnLabHighlights([]);
            }

            if (priorPrescriptionsRes.status === 'fulfilled') {
                const previousPrescriptions = priorPrescriptionsRes.value.data?.prescriptions || [];
                const latestTemplateSource = previousPrescriptions.find((p) => parsePrescriptionMedicines(p.medicines).length > 0);
                if (latestTemplateSource) {
                    setLastPrescriptionTemplate({
                        sourceId: latestTemplateSource.id,
                        medicines: parsePrescriptionMedicines(latestTemplateSource.medicines)
                    });
                } else {
                    setLastPrescriptionTemplate(null);
                }
            } else {
                setLastPrescriptionTemplate(null);
            }
        } finally {
            setLoadingReturnSmartPack(false);
        }
    };

    const openPrescriptionModalForAppointment = (appointment) => {
        const persistedLabTests = parsePersistedLabTestIds(appointment?.pending_lab_test_ids);
        setSelectedAppointment(appointment);
        setMedicinesSelected([]);
        setLockedLabTestIds(persistedLabTests);
        setPrescriptionForm({
            ...INITIAL_PRESCRIPTION_FORM,
            lab_test_ids: persistedLabTests
        });
        setReturnLabHighlights([]);
        setLastPrescriptionTemplate(null);
        loadReturnConsultSmartPack(appointment?.patient_id, persistedLabTests);
        setShowPrescriptionModal(true);
    };

    const applyContinueTreatmentTemplate = () => {
        if (!lastPrescriptionTemplate?.medicines?.length) {
            toast.info('No previous medicine template available for this patient');
            return;
        }
        setMedicinesSelected(lastPrescriptionTemplate.medicines);
        toast.success('Previous treatment template applied');
    };

    const handlePrescribe = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...prescriptionForm,
                medicines: medicinesSelected,
                patient_id: isDirectConsultation ? selectedPatient.id : selectedAppointment.patient_id,
                appointment_id: isDirectConsultation ? null : selectedAppointment.id,
                consultation_fee: parseFloat(prescriptionForm.consultation_fee) || 0,
                admit_patient: Boolean(prescriptionForm.admit_patient),
                stay_days: prescriptionForm.admit_patient ? Number(prescriptionForm.stay_days || 0) : null
            };
            const res = await api.post('/prescriptions', payload);
            const admissionNote = res.data?.admission_requested ? ' Admission request sent to receptionist.' : '';
            const message = isDirectConsultation
                ? `Direct consultation completed successfully!${admissionNote}`
                : `Consultation completed successfully!${admissionNote}`;
            toast.success(message);
            
            if (!isDirectConsultation) {
                // Update appointment status to 'completed'
                await updateStatus(selectedAppointment.id, 'completed');
                await updatePatientFlowTracking(selectedAppointment.patient_id, 'completed_consultation');
                fetchAppointments();
            } else {
                // Update patient flow tracking for direct consultation
                await updatePatientFlowTracking(selectedPatient.id, 'completed_consultation');
                fetchPatients();
            }
            
            resetPrescriptionContext();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to issue prescription');
        }
    };

    const handleWaitingForLab = async () => {
        try {
            const currentPatientId = isDirectConsultation ? selectedPatient?.id : selectedAppointment?.patient_id;
            if (!currentPatientId) {
                toast.warning('Select patient first');
                return;
            }
            if (!Array.isArray(prescriptionForm.lab_test_ids) || prescriptionForm.lab_test_ids.length === 0) {
                toast.warning('Select at least one lab test before marking waiting');
                return;
            }

            await api.post('/prescriptions/waiting', {
                patient_id: currentPatientId,
                appointment_id: isDirectConsultation ? null : selectedAppointment?.id,
                lab_test_ids: prescriptionForm.lab_test_ids
            });

            toast.success('Patient moved to waiting and lab tests forwarded to lab technician queue');
            resetPrescriptionContext();
            fetchAppointments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to move patient to waiting');
        }
    };

    const updatePatientFlowTracking = async (patientId, status) => {
        try {
            await api.patch('/patient-flow/status', { 
                patient_id: patientId, 
                status: status 
            });
        } catch (err) {
            console.error('Failed to update tracking:', err);
        }
    };

    const toggleLabTest = (testId) => {
        const normalizedId = String(testId);
        const isLocked = lockedLabTestIds.includes(normalizedId);
        if (isLocked && prescriptionForm.lab_test_ids.includes(normalizedId)) {
            toast.info('Previously selected lab tests stay fixed for this return consultation');
            return;
        }
        setPrescriptionForm(prev => ({
            ...prev,
            lab_test_ids: prev.lab_test_ids.includes(normalizedId)
                ? prev.lab_test_ids.filter(id => id !== normalizedId)
                : [...prev.lab_test_ids, normalizedId]
        }));
    };

    const toggleMedicine = (medId) => {
        setMedicinesSelected(prev => {
            const existing = prev.find(m => m.id === medId);
            if (existing) {
                return prev.filter(m => m.id !== medId);
            } else {
                return [...prev, { id: medId, quantity: 1, dosage: '', instructions: '' }];
            }
        });
    };

    const updateMedicineField = (medId, field, value) => {
        setMedicinesSelected(prev => prev.map(m => 
            m.id === medId ? { ...m, [field]: value } : m
        ));
    };

    return (
        <div className="space-y-10 animate-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/10">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40">
                        <User size={40} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Doctor's Command</h1>
                        <p className="text-slate-500 mt-1 font-semibold flex items-center gap-2">
                            <Clock className="text-blue-500" size={16} />
                            {activeTab === 'appointments' ? 'Manage consultations & prescriptions' : 'View assigned patients'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="px-6 py-2 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeTab === 'appointments' ? 'Appointments' : 'Patients'}</p>
                        <p className="text-xl font-black text-slate-900">{activeTab === 'appointments' ? appointments.length : patients.length}</p>
                    </div>
                    <div className="w-px h-10 bg-slate-200 my-auto"></div>
                    <div className="px-6 py-2 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending</p>
                        <p className="text-xl font-black text-orange-600">{activeTab === 'appointments' ? appointments.filter(a => a.status === 'pending').length : 0}</p>
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('appointments')}
                    className={`px-6 py-3 font-bold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'appointments'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Calendar size={18} /> My Appointments
                </button>
                <button
                    onClick={() => setActiveTab('patients')}
                    className={`px-6 py-3 font-bold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'patients'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Users size={18} /> My Patients
                </button>
                <button
                    onClick={() => setActiveTab('labreports')}
                    className={`px-6 py-3 font-bold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'labreports'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Beaker size={18} /> Lab Reports
                </button>
            </div>

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
                <div className="card overflow-hidden">
                    <div className="p-6 px-10 border-b border-slate-100 bg-slate-50/30">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                            <Calendar size={22} className="text-blue-600" />
                            Patient Consultation Queue
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white border-b border-slate-100">
                                    <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Record</th>
                                    <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Type</th>
                                    <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule</th>
                                    <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Progress</th>
                                    <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Consultation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {appointments.map((appt) => (
                                    <tr key={appt.id} className="group hover:bg-blue-50/40 transition-all">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white border-2 border-slate-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm group-hover:border-blue-200 group-hover:scale-110 transition-all">
                                                    {appt.patient_name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-slate-900">{appt.patient_name}</p>
                                                    <p className="text-xs font-bold text-slate-400">Age: {appt.age} | {appt.gender}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col gap-2">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold w-fit ${
                                                    appt.patient_type === 'inpatient'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {appt.patient_type}
                                                </span>
                                                {appt.appointment_type === 'walkin' && (
                                                    <span className="px-2 py-1 rounded-lg text-xs font-bold w-fit bg-amber-100 text-amber-700">
                                                        Walk-in {appt.walkin_token ? `• ${appt.walkin_token}` : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-black text-slate-700">{new Date(appt.appointment_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</span>
                                                <span className="text-xs font-bold text-blue-500 bg-blue-50 w-fit px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                                                    <Clock size={12} strokeWidth={3} /> {new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="space-y-2">
                                                <span className={`badge ${appt.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    appt.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                                        appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                            'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {appt.status}
                                                </span>
                                                <p className="text-[11px] text-slate-500 font-semibold">
                                                    Priority: {appt.queue_priority_reason || 'Standard queue'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex justify-end gap-3">
                                                {appt.status === 'pending' && appt.appointment_type === 'walkin' && !appt.doctor_id && (
                                                    <button
                                                        onClick={() => claimWalkinAppointment(appt.id)}
                                                        className="btn-primary flex items-center gap-2 py-2 px-6 text-xs"
                                                    >
                                                        <CheckCircle size={14} /> Attend
                                                    </button>
                                                )}
                                                {appt.status === 'pending' && !(appt.appointment_type === 'walkin' && !appt.doctor_id) && (
                                                    <>
                                                        <button
                                                            onClick={() => updateStatus(appt.id, 'approved')}
                                                            className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-600 hover:text-white transition-all transform active:scale-95"
                                                        >
                                                            <CheckCircle size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => updateStatus(appt.id, 'cancelled')}
                                                            className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all transform active:scale-95"
                                                        >
                                                            <XCircle size={20} />
                                                        </button>
                                                    </>
                                                )}
                                                {appt.status === 'approved' && (
                                                    <button
                                                        onClick={() => openPrescriptionModalForAppointment(appt)}
                                                        className="btn-primary flex items-center gap-2 py-2 px-6 text-xs"
                                                    >
                                                        <Pill size={14} /> Prescribe
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {appointments.length === 0 && !loading && (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Calendar size={32} className="text-slate-200" />
                                </div>
                                <p className="font-bold text-slate-800">Clear queue</p>
                                <p className="text-slate-400 text-sm italic">No patients currently scheduled for this slot</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Lab Reports Tab */}
            {activeTab === 'labreports' && (
                <div>
                    <div className="mb-4 flex flex-wrap gap-4 items-center">
                        <label className="text-sm font-bold">Select Patient</label>
                        <select
                            className="input-field h-10"
                            value={selectedPatientForReports || ''}
                            onChange={(e) => {
                                const id = e.target.value;
                                setSelectedPatientForReports(id);
                                fetchPatientReports(id);
                            }}
                        >
                            <option value="">-- Select Patient --</option>
                            {patients.map((patient) => (
                                <option key={patient.id} value={patient.id}>
                                    {patient.name} ({patient.patient_type || 'outpatient'})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {patientReports && patientReports.length > 0 ? (
                            patientReports.map((report) => (
                                <div key={report.id} className="card p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-slate-900 truncate">Lab Report</h3>
                                            <p className="text-xs text-slate-500 mt-1">{new Date(report.created_at || report.uploaded_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 mb-4">Patient: {selectedPatientForReports ? `ID ${selectedPatientForReports}` : 'N/A'}</p>
                                    <div className="flex gap-2">
                                        <a
                                            className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                                            href={`http://localhost:5000/${report.file_path}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Download
                                        </a>
                                        <a
                                            className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                                            href={`http://localhost:5000/${report.file_path}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            View
                                        </a>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-16">
                                <p className="text-slate-500 font-semibold">No lab reports available yet</p>
                                <p className="text-slate-400 text-sm mt-2">Select a patient and wait for lab reports to be uploaded</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Patients Tab */}
            {activeTab === 'patients' && (
                <div>
                    <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
<label className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                            🔍 Search Patients
                        </label>
                        <input
                            type="text"
                            placeholder="Search by patient name..."
                            className="input-field w-full max-w-md h-12"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <p className="text-xs text-slate-500 mt-1">{patients.length} patients found</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {patients.map(patient => (
                            <div key={patient.id} className="card p-6 hover:shadow-lg transition-all">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                        {patient.name[0]}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-900">{patient.name}</h3>
                                        <p className="text-xs text-slate-500">{patient.email}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400">Age</p>
                                        <p className="text-lg font-bold text-slate-900">{patient.age || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400">Blood Group</p>
                                        <p className="text-lg font-bold text-red-600">{patient.blood_group || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400">Appointments</p>
                                        <p className="text-lg font-bold text-slate-900">{patient.total_appointments}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400">Completed</p>
                                        <p className="text-lg font-bold text-green-600">{patient.completed_appointments}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedPatient(patient);
                                        setIsDirectConsultation(true);
                                        setLockedLabTestIds([]);
                                        setReturnLabHighlights([]);
                                        setLastPrescriptionTemplate(null);
                                        setLoadingReturnSmartPack(false);
                                        setMedicinesSelected([]);
                                        setPrescriptionForm(INITIAL_PRESCRIPTION_FORM);
                                        setShowPrescriptionModal(true);
                                    }}
                                    className="w-full mt-6 btn-primary flex items-center justify-center gap-2 py-3"
                                >
                                    <Pill size={18} /> Prescribe (Direct Consultation)
                                </button>
                            </div>
                        ))}
                        {patients.length === 0 && !loading && (
                            <div className="col-span-full text-center py-20">
                                <Users size={48} className="text-slate-200 mx-auto mb-4" />
                                <p className="font-bold text-slate-800">No patients found</p>
                                <p className="text-slate-400 text-sm">{searchTerm ? 'Try a different search term' : 'No patients assigned yet. Appointments will appear here once booked'}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Prescription Modal */}
            {showPrescriptionModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">
                                    {isDirectConsultation ? 'Direct Consultation & Prescription' : 'Consultation & Prescription'}
                                </h2>
                                <p className="text-slate-500 mt-1">
                                    Patient: <span className="font-semibold text-slate-700">
                                        {isDirectConsultation ? selectedPatient?.name : selectedAppointment?.patient_name}
                                    </span>
                                    {isDirectConsultation && <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-bold">Direct</span>}
                                </p>
                            </div>
                            <button onClick={resetPrescriptionContext} className="text-slate-400 hover:text-slate-600">X</button>
                        </div>
                        
                        <form onSubmit={handlePrescribe} className="space-y-6">
                            {!isDirectConsultation && (
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-emerald-800">Return Consult Smart Pack</p>
                                            <p className="text-xs text-emerald-700">
                                                {loadingReturnSmartPack
                                                    ? 'Loading prior treatment and completed lab highlights...'
                                                    : `${returnLabHighlights.length} matching lab report(s) ready`}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={applyContinueTreatmentTemplate}
                                            disabled={loadingReturnSmartPack || !lastPrescriptionTemplate?.medicines?.length}
                                            className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            Continue Last Treatment
                                        </button>
                                    </div>
                                    {returnLabHighlights.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {returnLabHighlights.slice(0, 3).map((test) => (
                                                <div key={test.id} className="text-xs text-emerald-800 bg-white border border-emerald-100 rounded-md px-3 py-2">
                                                    {test.test_name} ({test.test_category}) {test.completed_date ? `- ${new Date(test.completed_date).toLocaleDateString()}` : ''}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Consultation Fee */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
<label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    Fixed Consultation Fee <span className="text-lg font-black text-blue-600">₹500</span>
                                </label>
                                <input
                                    type="number"
                                    value="500"
                                    readOnly
                                    className="input-field h-10 bg-blue-50 border-blue-200 text-blue-900 font-bold cursor-not-allowed"
                                />
                                <p className="text-xs text-slate-600 mt-1">Standard fixed fee for consultation</p>
                            </div>

                            {/* Optional Inpatient Admission Request */}
                            <div className="border-t pt-6">
                                <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(prescriptionForm.admit_patient)}
                                        onChange={(e) => setPrescriptionForm(prev => ({
                                            ...prev,
                                            admit_patient: e.target.checked,
                                            stay_days: e.target.checked ? prev.stay_days : ''
                                        }))}
                                        className="rounded w-4 h-4 cursor-pointer"
                                    />
                                    Request Inpatient Admission (Optional)
                                </label>
                                {prescriptionForm.admit_patient && (
                                    <div className="mt-3 max-w-xs">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                            Planned Stay (Days)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="input-field h-10"
                                            placeholder="e.g. 3"
                                            value={prescriptionForm.stay_days}
                                            onChange={(e) => setPrescriptionForm(prev => ({ ...prev, stay_days: e.target.value }))}
                                            required={Boolean(prescriptionForm.admit_patient)}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Medicines Section */}
                            <div className="border-t pt-6">
                                <label className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <Pill size={16} className="text-green-600" /> Medicines (Optional - Multi-select)
                                </label>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto bg-slate-50 p-4 rounded-xl">
                                    {medicines.map(med => {
                                        const selectedMed = medicinesSelected.find(m => m.id === med.id);
                                        return (
                                            <div key={med.id} className="flex items-start gap-3 p-3 hover:bg-white rounded-xl cursor-pointer transition-all border border-slate-100 group">
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedMed}
                                                    onChange={() => toggleMedicine(med.id)}
                                                    className="rounded w-4 h-4 cursor-pointer mt-1 flex-shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-semibold text-slate-900">{med.name}</span>
                                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                            Stock: {med.stock > 0 ? med.stock : 'Out'}
                                                        </span>
                                                    </div>
                                                    {selectedMed && (
                                                        <div className="space-y-2 pt-2 border-t border-slate-100">
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="number"
                                                                    placeholder="Qty"
                                                                    className="input-field flex-1 text-xs h-8"
                                                                    min="1"
                                                                    value={selectedMed.quantity}
                                                                    onChange={(e) => updateMedicineField(med.id, 'quantity', parseInt(e.target.value) || 1)}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Dosage e.g. 1-0-1"
                                                                    className="input-field flex-1 text-xs h-8"
                                                                    value={selectedMed.dosage}
                                                                    onChange={(e) => updateMedicineField(med.id, 'dosage', e.target.value)}
                                                                />
                                                            </div>
                                                            <textarea
                                                                className="input-field text-xs min-h-[60px]"
                                                                placeholder="Instructions..."
                                                                value={selectedMed.instructions}
                                                                onChange={(e) => updateMedicineField(med.id, 'instructions', e.target.value)}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-slate-600 mt-2">Selected: {medicinesSelected.length} medicines</p>
                            </div>

                            {/* Lab Tests Section */}
                            {labTests.length > 0 && (
                                <div className="border-t pt-6">
                                    <label className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                        <Beaker size={16} className="text-orange-600" /> Lab Tests (Optional)
                                    </label>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto bg-slate-50 p-3 rounded-lg">
                                        {labTests.map(test => (
                                            <label key={test.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-all">
                                                <input
                                                    type="checkbox"
                                                    checked={prescriptionForm.lab_test_ids.includes(String(test.id))}
                                                    onChange={() => toggleLabTest(test.id)}
                                                    disabled={lockedLabTestIds.includes(String(test.id))}
                                                    className="rounded w-4 h-4 cursor-pointer"
                                                />
                                                <div className="flex-1">
                                                    <span className="text-sm font-semibold text-slate-700">{test.test_name || test.name}</span>
                                                    <p className="text-xs text-slate-500">{test.test_category}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-600 mt-2">Selected: {prescriptionForm.lab_test_ids.length} tests</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t">
                                <button 
                                    type="button" 
                                    onClick={resetPrescriptionContext}
                                    className="px-4 py-3 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleWaitingForLab}
                                    className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold transition-all"
                                >
                                    Waiting
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 btn-primary flex items-center justify-center gap-2 py-3"
                                >
                                    <Send size={18} /> Complete Consultation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorDashboard;


