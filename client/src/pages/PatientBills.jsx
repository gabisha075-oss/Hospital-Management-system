import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Download, FileText, Calendar, CreditCard, Pill, Beaker, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const PatientBills = () => {
    const [bills, setBills] = useState([]);
    const [consultations, setConsultations] = useState([]);
    const [patientId, setPatientId] = useState(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBillingData();
    }, []);

    const fetchBillingData = async () => {
        try {
            setLoading(true);
            const profileRes = await api.get('/patients/profile/me');
            const me = profileRes.data.patient;
            setPatientId(me.id);

            if (me) {
                // Fetch bills
                const billsRes = await api.get(`/billing/patient/${me.id}`);
                setBills(billsRes.data.bills || []);

                // Fetch consultation history
                const consultRes = await api.get(`/patients/${me.id}/consultations`);
                setConsultations(consultRes.data.consultations || []);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            toast.error('Failed to load billing information');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotalAmount = () => {
        // Bills already include consultation/lab/medicine charges.
        // Do not add consultation fees again, otherwise totals are double-counted.
        return bills.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
    };

const downloadInvoice = async (id) => {
        console.log('🧾 Starting PDF download for bill ID:', id);
        try {
            console.log('📡 Making API request to:', `/billing/${id}/pdf`);
            const res = await api.get(`/billing/${id}/pdf`, { responseType: 'arraybuffer' });
            console.log('✅ API response received, size:', res.data.byteLength, 'type:', res.headers['content-type']);
            
            // Validate PDF header (%PDF)
            const pdfHeader = new Uint8Array(res.data).slice(0, 4);
            const headerStr = String.fromCharCode(...pdfHeader);
            console.log('PDF header:', headerStr);
            
            if (!headerStr.startsWith('%PDF')) {
                throw new Error('Invalid PDF - missing %PDF header');
            }
            
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            console.log('📥 Valid PDF downloaded successfully');
            toast.success('PDF downloaded successfully!');
        } catch (err) {
            console.error('❌ Download failed:', err.response?.status, err.response?.data, err.message);
            toast.error(`Download failed: ${err.response?.status || err.message}`);
        }
    };

    const generateInvoiceForConsultation = async (consultation) => {
        try {
            // Create a billing entry for this consultation
            const invoiceData = {
                patient_id: patientId,
                items: [
                    {
                        description: `Consultation with Dr. ${consultation.doctor_name}`,
                        amount: parseFloat(consultation.consultation_fee)
                    }
                ],
                total_amount: parseFloat(consultation.consultation_fee),
                status: 'unpaid'
            };

            const res = await api.post('/billing', invoiceData);
            toast.success('Invoice generated successfully');
            setShowInvoiceModal(false);
            fetchBillingData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to generate invoice');
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[600px]">
                <div className="text-center">
                    <CreditCard className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
                    <p className="text-slate-600 font-semibold">Loading billing information...</p>
                </div>
            </div>
        );
    }

    const totalAmount = calculateTotalAmount();
    const paidAmount = bills.reduce((sum, b) => sum + (parseFloat(b.paid_amount) || 0), 0);
    const pendingAmount = totalAmount - paidAmount;

    return (
        <div className="space-y-10 animate-in pb-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/10">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-emerald-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                        <CreditCard size={40} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Accounts Ledger</h1>
                        <p className="text-slate-500 mt-1 font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            Verified medical invoices and billing history
                        </p>
                    </div>
                </div>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-semibold mb-1">Total Amount</p>
                            <p className="text-3xl font-black text-slate-900">${totalAmount.toFixed(2)}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <CreditCard size={24} />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-semibold mb-1">Paid Amount</p>
                            <p className="text-3xl font-black text-green-600">${paidAmount.toFixed(2)}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-sm font-semibold mb-1">Pending Amount</p>
                            <p className="text-3xl font-black text-orange-600">${pendingAmount.toFixed(2)}</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                            <Clock size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Consultations Section */}
            {consultations.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                        <Pill className="text-blue-600" size={28} /> Consultation Charges
                    </h2>
                    <div className="space-y-3">
                        {consultations.map(consultation => (
                            <div key={consultation.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-200/60 hover:bg-slate-100 transition-all">
                                <div className="flex-1">
                                    <p className="font-semibold text-slate-900">Dr. {consultation.doctor_name}</p>
                                    <p className="text-sm text-slate-500">
                                        {new Date(consultation.consultation_date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-slate-900">${parseFloat(consultation.consultation_fee).toFixed(2)}</p>
                                    <button
                                        onClick={() => {
                                            setSelectedBill(consultation);
                                            setShowInvoiceModal(true);
                                        }}
                                        className="text-xs mt-1 px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-semibold transition-all"
                                    >
                                        Generate Invoice
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Bills Section */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <FileText className="text-emerald-600" size={28} /> Invoices & Bills
                </h2>
                {bills.map(bill => (
                    <div key={bill.id} className="card-hover group bg-white rounded-[2rem] border border-slate-200/60 shadow-lg shadow-slate-200/20 overflow-hidden relative p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-8">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-sm border border-emerald-100">
                                <FileText size={28} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                    Invoice {bill.id}
                                </p>
                                <h3 className="font-black text-xl text-slate-900 mb-2">Hospital Services Charge</h3>
                                <div className="flex items-center gap-6 flex-wrap">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                                        <Calendar size={14} className="text-slate-400" />
                                        {new Date(bill.created_at).toLocaleDateString(undefined, {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </div>
                                    <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-black uppercase tracking-tighter">
                                        ${bill.total_amount}
                                    </div>
                                    <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-tighter ${
                                        bill.status === 'paid' 
                                            ? 'bg-green-50 text-green-700' 
                                            : 'bg-orange-50 text-orange-700'
                                    }`}>
                                        {bill.status}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => downloadInvoice(bill.id)}
                                className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-sm transition-all flex items-center gap-3 shadow-xl shadow-slate-200 group/btn"
                            >
                                <Download size={18} className="group-hover/btn:translate-y-1 transition-transform" />
                                Download PDF
                            </button>
                        </div>
                    </div>
                ))}
                {bills.length === 0 && consultations.length === 0 && (
                    <div className="text-center py-24 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                        <CreditCard size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-lg font-bold text-slate-700">No transactions recorded</p>
                        <p className="text-slate-400 text-sm">Your billing pipeline is currently empty</p>
                    </div>
                )}
            </div>


            {/* Invoice Generation Modal */}
            {showInvoiceModal && selectedBill && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Generate Invoice</h2>
                        
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                            <p className="text-sm text-slate-600 font-semibold mb-1">Consultation Charge</p>
                            <p className="text-sm text-slate-900 mb-2">Dr. {selectedBill.doctor_name}</p>
                            <p className="text-2xl font-bold text-blue-600">${parseFloat(selectedBill.consultation_fee).toFixed(2)}</p>
                        </div>

                        <p className="text-slate-600 mb-6 text-sm">
                            Click confirm to generate an invoice for this consultation. The invoice will be added to your billing records.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowInvoiceModal(false)}
                                className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => generateInvoiceForConsultation(selectedBill)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-bold transition-all"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientBills;
