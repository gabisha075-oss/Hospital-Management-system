import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import PatientFlowTracking from '../components/PatientFlowTracking';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    UserPlus,
    Receipt,
    Search,
    Plus,
    Trash2,
    Download,
    Edit3,
    Phone,
    MapPin,
    Droplet,
    UserCircle2,
    Mail,
    Lock,
    Calendar,
    Clock,
    Building2,
    Activity,
    Hospital,
    CreditCard
} from 'lucide-react';

const INITIAL_REGISTER_FORM = {
    name: '',
    email: '',
    password: '',
    role: 'patient',
    patient_type: 'outpatient',
    age: '',
    gender: '',
    blood_group: '',
    phone: '',
    address: '',
    walkin_now: false,
    walkin_priority: 'routine',
    walkin_notes: ''
};

const ReceptionistDashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [inpatients, setInpatients] = useState([]);
    const [inpatientStats, setInpatientStats] = useState(null);
    const [admissionRequests, setAdmissionRequests] = useState([]);
    const [bills, setBills] = useState([]);
    const [activeTab, setActiveTab] = useState('billing');

    // Modal states
    const [showBillModal, setShowBillModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAdmissionProcessModal, setShowAdmissionProcessModal] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);

    // Form states
    const [newBill, setNewBill] = useState({ patient_id: '', items: [{ description: '', amount: '' }] });
    const [patientServices, setPatientServices] = useState(null);
    const [loadingServices, setLoadingServices] = useState(false);
    const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER_FORM);

    const [editForm, setEditForm] = useState({ id: '', name: '', age: '', gender: '', blood_group: '', phone: '', address: '' });
    const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'card', reference: '' });
    const [selectedBill, setSelectedBill] = useState(null);
    const [selectedTimelinePatient, setSelectedTimelinePatient] = useState(null);
    const [billingTimeline, setBillingTimeline] = useState([]);
    const [timelineSummary, setTimelineSummary] = useState(null);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [selectedAdmissionRequest, setSelectedAdmissionRequest] = useState(null);
    const [admissionProcessForm, setAdmissionProcessForm] = useState({ bed_id: '', stay_days: '', notes: '' });

    const getRemainingAmount = (bill) =>
        Math.max(0, Number(bill?.total_amount || 0) - Number(bill?.paid_amount || 0));

    useEffect(() => {
        fetchPatients();
        fetchInpatients();
        fetchBills();
        fetchAdmissionRequests();
    }, []);

    useEffect(() => {
        if (location.state?.openAdmissionRequests) {
            setActiveTab('inpatients');
            fetchAdmissionRequests();
        }
    }, [location.state]);

    useEffect(() => {
        if (newBill.patient_id && showBillModal) {
            fetchPatientServices(newBill.patient_id);
        }
    }, [newBill.patient_id, showBillModal]);


    const fetchPatients = async () => {
        try {
            const res = await api.get('/patients');
            // Filter to only show outpatients
            const outpatients = res.data.patients.filter(p => p.patient_type === 'outpatient' || !p.patient_type);
            setPatients(outpatients);
        } catch (err) { console.error(err); }
    };

    const fetchInpatients = async () => {
        try {
            const res = await api.get('/patients/inpatients/all');
            setInpatients(res.data?.inpatients ?? res.data?.patients ?? []);
            
            // Also fetch inpatient stats
            const statsRes = await api.get('/patients/inpatients/stats');
            setInpatientStats(statsRes.data.stats || {});
        } catch (err) { console.error(err); }
    };

    const fetchAdmissionRequests = async () => {
        try {
            const res = await api.get('/patients/admission-requests/pending');
            setAdmissionRequests(res.data.requests || []);
        } catch (err) {
            console.error('Failed to fetch admission requests:', err);
        }
    };

    const fetchBills = async () => {
        try {
            const res = await api.get('/billing');
            setBills(res.data.bills);
        } catch (err) { console.error(err); }
    };

    const goToBedAllocation = (request) => {
        navigate('/receptionist/beds', {
            state: {
                admissionRequest: {
                    id: request.id,
                    patient_id: request.patient_id,
                    patient_name: request.patient_name,
                    doctor_name: request.doctor_name,
                    stay_days: request.stay_days,
                    notes: request.notes
                },
                ts: Date.now()
            }
        });
    };

    const openAdmissionProcessModal = (request) => {
        setSelectedAdmissionRequest(request);
        setAdmissionProcessForm({
            bed_id: '',
            stay_days: request.stay_days || '',
            notes: request.notes || ''
        });
        setShowAdmissionProcessModal(true);
    };

    const handleProcessAdmissionRequest = async (e) => {
        e.preventDefault();
        if (!selectedAdmissionRequest) return;
        try {
            const payload = {
                stay_days: Number(admissionProcessForm.stay_days),
                notes: admissionProcessForm.notes
            };
            if (admissionProcessForm.bed_id) {
                payload.bed_id = Number(admissionProcessForm.bed_id);
            }
            await api.patch(`/patients/admission-requests/${selectedAdmissionRequest.id}/process`, payload);
            toast.success('Patient converted to inpatient and room-stay billing added');
            setShowAdmissionProcessModal(false);
            setSelectedAdmissionRequest(null);
            setAdmissionProcessForm({ bed_id: '', stay_days: '', notes: '' });
            fetchAdmissionRequests();
            fetchInpatients();
            fetchBills();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to process admission request');
        }
    };

    const handleRegisterPatient = async (e) => {
        e.preventDefault();
        try {
            const registerRes = await api.post('/auth/register', {
                ...registerForm,
                role: 'patient'
            });

            const createdPatientId = registerRes?.data?.data?.patient_id;
            if (registerForm.walkin_now && createdPatientId) {
                await api.post('/appointments/walkin', {
                    patient_id: createdPatientId,
                    priority: registerForm.walkin_priority || 'routine',
                    notes: registerForm.walkin_notes || ''
                });
            }

            toast.success('Patient registered successfully');
            setShowRegisterModal(false);
            setRegisterForm(INITIAL_REGISTER_FORM);
            fetchPatients();
            fetchInpatients();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        }
    };

    const handleUpdatePatient = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/patients/${editForm.id}`, {
                name: editForm.name,
                age: editForm.age,
                gender: editForm.gender,
                blood_group: editForm.blood_group,
                phone: editForm.phone,
                address: editForm.address
            });
            toast.success('Patient details updated');
            setShowEditModal(false);
            fetchPatients();
        } catch (err) {
            toast.error('Update failed');
        }
    };

    const openEditModal = (patient) => {
        setEditForm({
            id: patient.id,
            name: patient.name,
            age: patient.age || '',
            gender: patient.gender || '',
            blood_group: patient.blood_group || '',
            phone: patient.phone || '',
            address: patient.address || ''
        });
        setShowEditModal(true);
    };

    const fetchPatientServices = async (patientId) => {
        if (!patientId) {
            setPatientServices(null);
            return;
        }
        setLoadingServices(true);
        try {
            const res = await api.get(`/billing/patient/${patientId}/services`);
            setPatientServices(res.data.services);
            
            // Auto-populate items from services
            const items = [];
            
            // Consultations
            if (res.data.services.consultations.total > 0) {
                items.push({
                    description: `Consultation Fee (${res.data.services.consultations.count} visit${res.data.services.consultations.count > 1 ? 's' : ''})`,
                    amount: res.data.services.consultations.total.toString()
                });
            }
            
            // Labs
            res.data.services.labs.forEach(lab => {
                items.push({
                    description: `Lab Test: ${lab.name}`,
                    amount: lab.cost.toString()
                });
            });
            
            // Meds
            res.data.services.meds.forEach(med => {
                items.push({
                    description: `Medicine: ${med.name} (Qty: ${med.quantity})`,
                    amount: med.total.toString()
                });
            });
            
            setNewBill(prev => ({ ...prev, items: items.length > 0 ? items : prev.items }));
            
            toast.success(`Loaded ₹${res.data.services.grand_total.toFixed(2)} in services for this patient`);
        } catch (err) {
            console.error('Failed to fetch patient services:', err);
            toast.error('No services found for this patient');
            setPatientServices(null);
        } finally {
            setLoadingServices(false);
        }
    };

    const handleCreateBill = async (e) => {
        e.preventDefault();
        const total_amount = newBill.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        try {
            await api.post('/billing', { ...newBill, total_amount });
            toast.success('Invoice generated successfully');
            setShowBillModal(false);
            setNewBill({ patient_id: '', items: [{ description: '', amount: '' }] });
            setPatientServices(null);
            fetchBills();
        } catch (err) { toast.error('Failed to create bill'); }
    };


    const addItem = () => setNewBill({ ...newBill, items: [...newBill.items, { description: '', amount: '' }] });
    const removeItem = (index) => setNewBill({ ...newBill, items: newBill.items.filter((_, i) => i !== index) });

    const downloadInvoice = async (id) => {
        try {
            const res = await api.get(`/billing/${id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (err) { toast.error('PDF generation failed'); }
    };

    const openBillingTimeline = async (patientId, patientName) => {
        setTimelineLoading(true);
        setSelectedTimelinePatient({ id: patientId, name: patientName });
        setShowTimelineModal(true);
        try {
            const res = await api.get(`/billing/patient/${patientId}/timeline`);
            setBillingTimeline(res.data.timeline || []);
            setTimelineSummary(res.data.summary || null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load billing timeline');
            setBillingTimeline([]);
            setTimelineSummary(null);
        } finally {
            setTimelineLoading(false);
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!selectedBill) return;

        try {
            const paymentAmount = Number(paymentForm.amount);
            if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
                toast.error('Enter a valid payment amount');
                return;
            }

            const res = await api.patch(`/billing/${selectedBill.id}/pay`, {
                amount: paymentAmount,
                paymentMethod: paymentForm.paymentMethod,
                reference: paymentForm.reference
            });

            const updatedStatus = res.data?.bill?.status || 'partial';
            const updatedPaidAmount = res.data?.bill?.paidAmount ?? (Number(selectedBill.paid_amount || 0) + paymentAmount);
            const remainingAmount = res.data?.bill?.remainingAmount ?? Math.max(0, Number(selectedBill.total_amount || 0) - updatedPaidAmount);

            // Checkout patient if fully paid
            if (updatedStatus === 'paid' || remainingAmount <= 0) {
                try {
                    await api.patch(`/patient-flow/${selectedBill.patient_id}/checkout`, { notes: 'Bill paid' });
                    toast.success('Payment processed & patient checked out!');
                } catch (flowErr) {
                    console.warn('Checkout failed:', flowErr);
                }
            } else {
                toast.success('Payment processed successfully!');
            }

            setShowPaymentModal(false);
            setPaymentForm({ amount: '', paymentMethod: 'card', reference: '' });
            setSelectedBill(null);
            setBills(prevBills =>
                prevBills.map(bill =>
                    bill.id === selectedBill.id
                        ? { ...bill, status: updatedStatus, paid_amount: updatedPaidAmount }
                        : bill
                )
            );
            fetchBills(); // Refresh
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
        }
    };

    return (
        <div className="space-y-10 animate-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm border-b-4 border-b-blue-600/10">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Building2 className="text-blue-600" size={36} />
                        Reception Desk
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live system status: All medical departments online
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveTab('billing')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'billing' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        <Receipt size={16} className="inline mr-2" />
                        Billing
                    </button>
                    <button
                        onClick={() => { setActiveTab('patients'); fetchPatients(); }}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'patients' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        <UserCircle2 size={16} className="inline mr-2" />
                        Outpatients
                    </button>
                    <button
                        onClick={() => { setActiveTab('inpatients'); fetchInpatients(); fetchAdmissionRequests(); }}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'inpatients' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        <Hospital size={16} className="inline mr-2" />
                        Inpatients
                    </button>
                    {admissionRequests.length > 0 && (
                        <button
                            onClick={() => { setActiveTab('inpatients'); fetchAdmissionRequests(); }}
                            className="px-4 py-2 rounded-lg font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-all"
                        >
                            Admission Alerts ({admissionRequests.length})
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('live-flow')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'live-flow' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        <Activity size={16} className="inline mr-2" />
                        Live Patient Flow
                    </button>
                </div>
                <div className="flex flex-wrap gap-4">
                    {activeTab === 'billing' ? (
                        <button onClick={() => setShowBillModal(true)} className="btn-primary group">
                            <Plus size={18} className="transition-transform group-hover:rotate-90" />
                            Generate New Invoice
                        </button>
                    ) : activeTab === 'patients' ? (
                        <button onClick={() => setShowRegisterModal(true)} className="btn-primary group">
                            <UserPlus size={18} className="transition-transform group-hover:scale-110" />
                            Enroll New Patient
                        </button>
                    ) : null}
                </div>
            </header>

            {activeTab === 'billing' ? (
                <div className="card overflow-hidden">
                    <div className="p-1 px-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial Records</span>
                        <div className="flex gap-2 p-2">
                            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white">
                                    <th className="p-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Series No.</th>
                                    <th className="p-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Medical Beneficiary</th>
                                    <th className="p-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Revenue</th>
                                    <th className="p-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Service Date</th>
                                    <th className="p-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Documents</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 group">
                                {bills.map(bill => (
                                    <tr key={bill.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-6">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg font-mono text-xs font-bold border border-slate-200/50">
                                                #INV-{bill.id.toString().padStart(4, '0')}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                                    {bill.patient_name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{bill.patient_name}</p>
                                                    <p className="text-xs text-slate-500">{bill.patient_email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className="text-lg font-black text-slate-900">${Number(bill.total_amount || 0).toLocaleString()}</span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2 text-slate-600 font-medium">
                                                <Calendar size={14} className="text-slate-400" />
                                                {new Date(bill.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        const remaining = getRemainingAmount(bill);
                                                        setSelectedBill(bill);
                                                        setPaymentForm({ amount: remaining.toFixed(2), paymentMethod: 'card', reference: '' });
                                                        setShowPaymentModal(true);
                                                    }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-bold text-xs hover:bg-green-600 hover:text-white transition-all transform active:scale-95 shadow-sm shadow-green-200/50"
                                                >
                                                    <CreditCard size={14} strokeWidth={3} />
                                                    PAY
                                                </button>
                                                <button
                                                    onClick={() => openBillingTimeline(bill.patient_id, bill.patient_name)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl font-bold text-xs hover:bg-purple-600 hover:text-white transition-all transform active:scale-95 shadow-sm shadow-purple-200/50"
                                                >
                                                    <Clock size={14} strokeWidth={3} />
                                                    TIMELINE
                                                </button>
                                                <button
                                                    onClick={() => downloadInvoice(bill.id)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all transform active:scale-95 shadow-sm shadow-blue-200/50"
                                                >
                                                    <Download size={14} strokeWidth={3} />
                                                    PDF
                                                </button>
                                                {bill.status === 'paid' ? (
                                                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">Paid</span>
                                                ) : bill.status === 'partial' ? (
                                                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">Partial</span>
                                                ) : (
                                                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">Pending</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {bills.length === 0 && (
                        <div className="text-center py-24 bg-white">
                            <div className="inline-flex p-6 bg-slate-50 rounded-full mb-4">
                                <Receipt size={40} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">No transactions recorded</h3>
                            <p className="text-slate-500 text-sm">Create your first invoice to see the billing history</p>
                        </div>
                    )}
                </div>
            ) : null}
            {activeTab === 'patients' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {patients.map(p => (
                        <div key={p.id} className="card-hover group bg-white rounded-[2rem] border border-slate-200/60 shadow-lg shadow-slate-200/20 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditModal(p)}
                                    className="w-10 h-10 bg-white shadow-xl border border-slate-100 text-blue-600 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                                >
                                    <Edit3 size={18} />
                                </button>
                            </div>

                            <div className="p-8 pb-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-200 mb-6">
                                    {p.name[0]}
                                </div>
                                <h3 className="font-black text-xl text-slate-900 leading-tight mb-1">{p.name}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Mail size={12} strokeWidth={3} />
                                    {p.email}
                                </p>
                            </div>

                            <div className="p-8 pt-0 grid grid-cols-2 gap-4 mt-4">
                                <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Biological Age</p>
                                    <p className="text-lg font-black text-slate-900">{p.age || '--'} <span className="text-[10px] text-slate-400 uppercase">Yrs</span></p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Blood Type</p>
                                    <p className="text-lg font-black text-red-600 flex items-center justify-center gap-1">
                                        <Droplet size={14} strokeWidth={4} />
                                        {p.blood_group || 'N/A'}
                                    </p>
                                </div>
                                <div className="col-span-full bg-blue-50/50 rounded-2xl p-4 flex items-center gap-3 border border-blue-100/50">
                                    <Phone size={16} className="text-blue-600" />
                                    <span className="text-sm font-bold text-blue-900">{p.phone || 'Contact pending'}</span>
                                </div>
                                <div className="col-span-full flex items-center gap-3 px-1">
                                    <MapPin size={14} className="text-slate-400 shrink-0" />
                                    <span className="text-xs font-medium text-slate-500 line-clamp-1">{p.address || 'Address unverified'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {patients.length === 0 && (
                        <div className="col-span-full py-24 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-300">
                            <UserCircle2 size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-lg font-bold text-slate-700">Database is empty</p>
                            <p className="text-slate-400 text-sm">Register your first patient to begin operations</p>
                        </div>
                    )}
                </div>
            )}

            {/* Inpatients Tab */}
            {activeTab === 'inpatients' && (
                <div className="space-y-8">
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-slate-900">Doctor Admission Requests</h3>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                {admissionRequests.length} Pending
                            </span>
                        </div>
                        <div className="space-y-3">
                            {admissionRequests.length > 0 ? admissionRequests.map(req => (
                                <div key={req.id} className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-slate-900">{req.patient_name}</p>
                                        <p className="text-xs text-slate-500">Requested by Dr. {req.doctor_name}</p>
                                        <p className="text-xs text-slate-500 mt-1">Stay: {req.stay_days} day(s) | Rate/day: ${Number(req.daily_room_rate || 0).toFixed(2)}</p>
                                    </div>
                                    <button
                                        onClick={() => goToBedAllocation(req)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold"
                                    >
                                        Bed Allocation
                                    </button>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-500">No pending doctor admission requests.</p>
                            )}
                        </div>
                    </div>

                    {inpatientStats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="card bg-white p-6 rounded-2xl border border-slate-200/60">
                                <p className="text-slate-500 text-sm font-semibold mb-2">Total Inpatients</p>
                                <p className="text-4xl font-bold text-slate-900">{inpatientStats.total_inpatients || 0}</p>
                            </div>
                            <div className="card bg-white p-6 rounded-2xl border border-slate-200/60">
                                <p className="text-slate-500 text-sm font-semibold mb-2">Admitted Today</p>
                                <p className="text-4xl font-bold text-blue-600">{inpatientStats.admitted_today || 0}</p>
                            </div>
                            <div className="card bg-white p-6 rounded-2xl border border-slate-200/60">
                                <p className="text-slate-500 text-sm font-semibold mb-2">Discharged Today</p>
                                <p className="text-4xl font-bold text-green-600">{inpatientStats.discharged_today || 0}</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200/60 bg-slate-50">
                                        <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Patient</th>
                                        <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Bed</th>
                                        <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Ward</th>
                                        <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Admitted Date</th>
                                        <th className="p-6 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Days</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inpatients.length > 0 ? inpatients.map(ip => (
                                        <tr key={ip.id} className="border-b border-slate-200/30 hover:bg-slate-50 transition-colors">
                                            <td className="p-6">
                                                <div>
                                                    <p className="font-bold text-slate-900">{ip.patient_name}</p>
                                                    <p className="text-xs text-slate-500">{ip.email}</p>
                                                </div>
                                            </td>
                                            <td className="p-6 font-semibold text-slate-700">{ip.bed_number || 'N/A'}</td>
                                            <td className="p-6 font-semibold text-slate-700">{ip.ward_name || 'N/A'}</td>
                                            <td className="p-6 text-slate-600">{new Date(ip.admitted_date).toLocaleDateString()}</td>
                                            <td className="p-6">
                                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                                                    {ip.planned_stay_days || ip.days_admitted || 1}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="p-12 text-center">
                                                <Hospital size={40} className="mx-auto text-slate-300 mb-4" />
                                                <p className="text-slate-600 font-semibold">No inpatients currently</p>
                                                <p className="text-slate-500 text-sm">Admitted patients will appear here</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Live Patient Flow Tab */}
            {activeTab === 'live-flow' && (
                <PatientFlowTracking />
            )}

            {/* Register Patient Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <UserPlus className="text-blue-700" size={24} /> New Patient Account
                        </h2>
                        <form onSubmit={handleRegisterPatient} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Full Name</label>
                                <div className="relative">
                                    <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        className="input-field pl-10 h-12"
                                        placeholder="Enter patient name"
                                        required
                                        value={registerForm.name}
                                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        className="input-field pl-10 h-12"
                                        type="email"
                                        placeholder="patient@email.com"
                                        required
                                        value={registerForm.email}
                                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Temporary Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        className="input-field pl-10 h-12"
                                        type="password"
                                        placeholder="Initial login password"
                                        required
                                        value={registerForm.password}
                                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Age</label>
                                    <input
                                        className="input-field h-12"
                                        type="number"
                                        min="0"
                                        value={registerForm.age}
                                        onChange={(e) => setRegisterForm({ ...registerForm, age: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            className="input-field pl-10 h-12"
                                            type="tel"
                                            placeholder="Phone number"
                                            value={registerForm.phone}
                                            onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Blood Group</label>
                                    <input
                                        className="input-field h-12"
                                        type="text"
                                        placeholder="A+ / O-"
                                        value={registerForm.blood_group}
                                        onChange={(e) => setRegisterForm({ ...registerForm, blood_group: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Gender</label>
                                    <select
                                        className="input-field h-12"
                                        value={registerForm.gender}
                                        onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value })}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <textarea
                                            className="input-field pl-10 h-20 resize-none"
                                            placeholder="Full address"
                                            value={registerForm.address}
                                            onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Patient Type</label>
                                <select
                                    className="input-field h-12"
                                    value={registerForm.patient_type}
                                    onChange={(e) => setRegisterForm({ ...registerForm, patient_type: e.target.value })}
                                >
                                    <option value="outpatient">Outpatient</option>
                                    <option value="inpatient">Inpatient</option>
                                </select>
                            </div>
                            <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-3 space-y-3">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(registerForm.walkin_now)}
                                        onChange={(e) =>
                                            setRegisterForm({
                                                ...registerForm,
                                                walkin_now: e.target.checked
                                            })
                                        }
                                        className="rounded w-4 h-4 cursor-pointer"
                                    />
                                    Walk-in consultation now (no pre-booking)
                                </label>
                                {registerForm.walkin_now && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Walk-in Priority</label>
                                            <select
                                                className="input-field h-11"
                                                value={registerForm.walkin_priority}
                                                onChange={(e) =>
                                                    setRegisterForm({
                                                        ...registerForm,
                                                        walkin_priority: e.target.value
                                                    })
                                                }
                                            >
                                                <option value="routine">Routine</option>
                                                <option value="urgent">Urgent</option>
                                                <option value="emergency">Emergency</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Walk-in Notes (Optional)</label>
                                            <textarea
                                                className="input-field h-16 resize-none"
                                                placeholder="Short reason or urgency note"
                                                value={registerForm.walkin_notes}
                                                onChange={(e) =>
                                                    setRegisterForm({
                                                        ...registerForm,
                                                        walkin_notes: e.target.value
                                                    })
                                                }
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRegisterModal(false);
                                        setRegisterForm(INITIAL_REGISTER_FORM);
                                    }}
                                    className="flex-1 h-12 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 h-12 btn-primary shadow-lg shadow-blue-700/20">
                                    Register
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Patient Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Edit3 className="text-blue-700" size={24} /> Edit Medical Profile: {editForm.name}
                        </h2>
                        <form onSubmit={handleUpdatePatient} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Age</label>
                                <input
                                    className="input-field h-12"
                                    type="number"
                                    value={editForm.age}
                                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Gender</label>
                                <select
                                    className="input-field h-12"
                                    value={editForm.gender}
                                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Blood Group</label>
                                <select
                                    className="input-field h-12"
                                    value={editForm.blood_group}
                                    onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                                >
                                    <option value="">Select Blood Group</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        className="input-field pl-10 h-12"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="col-span-full">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Residential Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-4 text-slate-400" size={18} />
                                    <textarea
                                        className="input-field pl-10 min-h-[100px] pt-3"
                                        value={editForm.address}
                                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                            <div className="col-span-full flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 h-12 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 h-12 btn-primary shadow-lg shadow-blue-700/20">
                                    Update Profile
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Bill Modal */}
            {showBillModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-slate-800 mb-8">Generate Medical Invoice</h2>
                        <form onSubmit={handleCreateBill} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Select Patient</label>
                                <select
                                    className="input-field h-12"
                                    required
                                    value={newBill.patient_id}
                                    onChange={(e) => {
                                        const newPatientId = e.target.value;
                                        setNewBill({ ...newBill, patient_id: newPatientId });
                                    }}

                                >
                                    <option value="">-- Choose --</option>
                                    {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.email})</option>)}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Service Items</label>
                                    <button type="button" onClick={addItem} className="text-blue-700 font-bold text-sm flex items-center gap-1 hover:underline">
                                        <Plus size={16} /> Add Charge
                                    </button>
                                </div>
                                {newBill.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 items-end">
                                        <div className="flex-1">
                                            <input
                                                placeholder="Description (e.g. Consultation)"
                                                className="input-field"
                                                required
                                                value={item.description}
                                                onChange={e => {
                                                    const items = [...newBill.items];
                                                    items[idx].description = e.target.value;
                                                    setNewBill({ ...newBill, items });
                                                }}
                                            />
                                        </div>
                                        <div className="w-32">
                                            <input
                                                placeholder="Amount"
                                                type="number"
                                                className="input-field"
                                                required
                                                value={item.amount}
                                                onChange={e => {
                                                    const items = [...newBill.items];
                                                    items[idx].amount = e.target.value;
                                                    setNewBill({ ...newBill, items });
                                                }}
                                            />
                                        </div>
                                        {newBill.items.length > 1 && (
                                            <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg mb-1">
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6 border-t flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm">Total Invoice Amount</p>
                                    <p className="text-3xl font-bold text-slate-800">
                                        ${newBill.items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0).toFixed(2)}
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setShowBillModal(false)} className="px-6 py-2 border rounded-xl font-bold text-slate-600">Cancel</button>
                                    <button type="submit" className="btn-primary px-8">Issue Invoice</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAdmissionProcessModal && selectedAdmissionRequest && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Process Admission Request</h2>
                        <p className="text-sm text-slate-500 mb-4">
                            Patient: <span className="font-bold text-slate-700">{selectedAdmissionRequest.patient_name}</span>
                        </p>
                        <form onSubmit={handleProcessAdmissionRequest} className="space-y-4">
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                                <p className="text-sm text-blue-800 font-semibold">Bed allocation is automatic.</p>
                                <p className="text-xs text-blue-700 mt-1">System picks the next available bed and uses that bed's daily price for billing.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Stay Days</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    className="input-field h-10 w-full"
                                    value={admissionProcessForm.stay_days}
                                    onChange={(e) => setAdmissionProcessForm(prev => ({ ...prev, stay_days: e.target.value }))}
                                />
                            </div>
                            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                                Room rate is auto-picked from the allocated bed configuration.
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Notes (Optional)</label>
                                <textarea
                                    className="input-field min-h-[90px] w-full"
                                    value={admissionProcessForm.notes}
                                    onChange={(e) => setAdmissionProcessForm(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAdmissionProcessModal(false);
                                        setSelectedAdmissionRequest(null);
                                        setAdmissionProcessForm({ bed_id: '', stay_days: '', notes: '' });
                                    }}
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-bold transition-all"
                                >
                                    Confirm Conversion
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && selectedBill && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Process Payment</h2>
                        
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
                            <p className="text-sm text-slate-600 font-semibold mb-1">Bill Amount Due</p>
                            <p className="text-3xl font-bold text-green-600">${getRemainingAmount(selectedBill).toFixed(2)}</p>
                        </div>

                        <form onSubmit={handlePayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Amount Received ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={getRemainingAmount(selectedBill)}
                                    placeholder="0.00"
                                    className="input-field h-10 w-full"
                                    value={paymentForm.amount}
                                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Payment Method</label>
                                <select
                                    className="input-field h-10 w-full"
                                    value={paymentForm.paymentMethod}
                                    onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                                >
                                    <option value="card">Credit/Debit Card</option>
                                    <option value="bank">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="check">Check</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Transaction Reference #</label>
                                <input
                                    type="text"
                                    placeholder="Receipt/Transaction ID"
                                    className="input-field h-10 w-full"
                                    value={paymentForm.reference}
                                    onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPaymentModal(false);
                                        setSelectedBill(null);
                                        setPaymentForm({ amount: '', paymentMethod: 'card', reference: '' });
                                    }}
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold transition-all"
                                >
                                    Process Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Billing Timeline Modal */}
            {showTimelineModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Adaptive Billing Timeline</h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    Patient: <span className="font-semibold text-slate-700">{selectedTimelinePatient?.name || 'N/A'}</span>
                                </p>
                                {timelineSummary && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Latest Bill #{timelineSummary.id} | Total: ${Number(timelineSummary.total_amount || 0).toFixed(2)} | Paid: ${Number(timelineSummary.paid_amount || 0).toFixed(2)} | Status: {timelineSummary.status}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setShowTimelineModal(false);
                                    setBillingTimeline([]);
                                    setSelectedTimelinePatient(null);
                                    setTimelineSummary(null);
                                }}
                                className="text-slate-400 hover:text-slate-700 font-bold text-xl"
                            >
                                ×
                            </button>
                        </div>

                        {timelineLoading ? (
                            <p className="text-sm text-slate-500">Loading timeline...</p>
                        ) : billingTimeline.length === 0 ? (
                            <p className="text-sm text-slate-500">No billing timeline events found for this patient.</p>
                        ) : (
                            <div className="space-y-3">
                                {billingTimeline.map((event, idx) => (
                                    <div key={`${event.ref}-${idx}`} className="border border-slate-200 rounded-xl p-4">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                            <div>
                                                <p className="font-bold text-slate-900">{event.title}</p>
                                                <p className="text-xs text-slate-500">{event.description}</p>
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                    {new Date(event.ts).toLocaleString()} | Ref: {event.ref}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${Number(event.amount_delta) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {Number(event.amount_delta) >= 0 ? '+' : '-'}${Math.abs(Number(event.amount_delta || 0)).toFixed(2)}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Running Balance: ${Number(event.running_balance || 0).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceptionistDashboard;
