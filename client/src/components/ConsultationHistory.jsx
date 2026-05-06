import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    HistoryIcon, 
    FileText, 
    Pill, 
    Beaker, 
    DollarSign, 
    Calendar, 
    User,
    Download,
    Eye,
    Clock,
    AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

const ConsultationHistory = ({ patientId }) => {
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedConsultation, setSelectedConsultation] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    // New states for detailed data
    const [medicines, setMedicines] = useState([]);
    const [labTests, setLabTests] = useState([]);
    const [nextConsult, setNextConsult] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState('summary');

    useEffect(() => {
        if (patientId) {
            fetchConsultationHistory();
        }
    }, [patientId]);

    const fetchConsultationHistory = async () => {
        try {
            const res = await api.get(`/patients/${patientId}/consultations`);
            setConsultations(res.data.consultations || []);
        } catch (err) {
            console.error('Failed to fetch consultation history:', err);
            toast.error('Failed to load consultation history');
        } finally {
            setLoading(false);
        }
    };

    const fetchConsultationDetails = async (consultation) => {
        setModalLoading(true);
        try {
            const consultDate = new Date(consultation.consultation_date || consultation.created_at);
            const dateWindowStart = new Date(consultDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const dateWindowEnd = new Date(consultDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Fetch prescriptions for patient (filter by date client-side)
            const presRes = await api.get(`/prescriptions/patient/${patientId}`);
            const filteredMedicines = presRes.data.prescriptions.filter(p => {
                const pDate = new Date(p.created_at);
                return pDate >= new Date(dateWindowStart) && pDate <= new Date(dateWindowEnd + 'T23:59:59Z');
            });
            setMedicines(filteredMedicines);

            // Fetch completed lab tests
            const labRes = await api.get(`/lab-tests/patient/${patientId}/completed`);
            const filteredLabTests = labRes.data.tests.filter(t => {
                const tDate = new Date(t.completed_date || t.requested_date);
                return tDate >= new Date(dateWindowStart) && tDate <= new Date(dateWindowEnd + 'T23:59:59Z');
            });
            setLabTests(filteredLabTests);

            // Check next consultation (fetch future appointments or parse instructions)
            // Assuming /appointments endpoint exists; fallback to instructions
            try {
                const apptRes = await api.get(`/appointments?patient_id=${patientId}&status=pending,future`);
                const upcoming = apptRes.data.appointments?.[0];
                setNextConsult(upcoming || null);
            } catch {
                // Fallback: check instructions for follow-up keywords
                const hasFollowUp = consultation.instructions?.toLowerCase().match(/follow-up|review|next|revisit|return/i);
                setNextConsult(hasFollowUp ? { instructions: 'Follow-up recommended based on doctor notes' } : null);
            }

        } catch (err) {
            console.error('Failed to fetch details:', err);
            toast.error('Failed to load detailed consultation info');
        } finally {
            setModalLoading(false);
        }
    };

    const openDetails = (consultation) => {
        setSelectedConsultation(consultation);
        fetchConsultationDetails(consultation);
        setShowDetails(true);
        setActiveModalTab('summary');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-center">
                    <HistoryIcon className="animate-spin mb-3 mx-auto text-blue-600" size={32} />
                    <p className="text-slate-600 font-semibold">Loading consultation history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3 mb-6">
                    <HistoryIcon className="text-blue-600" size={28} />
                    Consultation History
                </h2>

                {consultations.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-600 font-semibold">No consultations yet</p>
                        <p className="text-slate-500 text-sm">Your consultation history will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {consultations.map((consultation) => (
                            <div 
                                key={consultation.id} 
                                className="border border-slate-200/60 rounded-xl p-5 hover:shadow-md transition-all bg-slate-50/30"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                                                {consultation.doctor_name ? consultation.doctor_name[0] : 'D'}
                                            </span>
                                            <h3 className="text-lg font-bold text-slate-900">
                                                Dr. {consultation.doctor_name || 'Unknown Doctor'}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-slate-600 flex items-center gap-2">
                                            <Calendar size={14} />
                                            {consultation.consultation_date 
                                                ? new Date(consultation.consultation_date).toLocaleDateString(undefined, {
                                                    weekday: 'short',
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                : new Date(consultation.created_at).toLocaleDateString()
                                            }
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => openDetails(consultation)}
                                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg flex items-center gap-2 font-semibold transition-all"
                                    >
                                        <Eye size={16} /> View Details
                                    </button>
                                </div>

                                {/* Quick Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
                                    {consultation.medicine_names && (
                                        <div className="flex items-center gap-2">
                                            <Pill size={16} className="text-orange-500" />
                                            <div>
                                                <p className="text-xs text-slate-500">Medicines</p>
                                                <p className="text-sm font-semibold text-slate-900">{consultation.medicine_names.split(', ').length}</p>
                                            </div>
                                        </div>
                                    )}
                                    {consultation.lab_tests_count > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Beaker size={16} className="text-purple-500" />
                                            <div>
                                                <p className="text-xs text-slate-500">Lab Tests</p>
                                                <p className="text-sm font-semibold text-slate-900">{consultation.lab_tests_count}</p>
                                            </div>
                                        </div>
                                    )}
                                    {consultation.consultation_fee && (
                                        <div className="flex items-center gap-2">
                                            <DollarSign size={16} className="text-green-500" />
                                            <div>
                                                <p className="text-xs text-slate-500">Fee</p>
                                                <p className="text-sm font-semibold text-slate-900">${parseFloat(consultation.consultation_fee).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <User size={16} className="text-slate-500" />
                                        <div>
                                            <p className="text-xs text-slate-500">Status</p>
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">
                                                Completed
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            {/* Enhanced Details Modal */}
            {showDetails && selectedConsultation && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl max-h-[95vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-3xl font-bold text-slate-900">Consultation Details</h2>
                            <button 
                                onClick={() => setShowDetails(false)}
                                className="text-slate-400 hover:text-slate-600 text-2xl"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-4">
                            <button
                                onClick={() => setActiveModalTab('summary')}
                                className={`px-6 py-2 font-bold flex items-center gap-2 rounded-lg transition-all ${
                                    activeModalTab === 'summary' 
                                        ? 'bg-blue-600 text-white shadow-lg' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <FileText size={18} /> Summary
                            </button>
                            <button
                                onClick={() => setActiveModalTab('medicines')}
                                className={`px-6 py-2 font-bold flex items-center gap-2 rounded-lg transition-all ${
                                    activeModalTab === 'medicines' 
                                        ? 'bg-orange-600 text-white shadow-lg' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <Pill size={18} /> Medicines ({medicines.length})
                            </button>
                            <button
                                onClick={() => setActiveModalTab('lab-tests')}
                                className={`px-6 py-2 font-bold flex items-center gap-2 rounded-lg transition-all ${
                                    activeModalTab === 'lab-tests' 
                                        ? 'bg-purple-600 text-white shadow-lg' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <Beaker size={18} /> Lab Tests ({labTests.length})
                            </button>
                            <button
                                onClick={() => setActiveModalTab('next-steps')}
                                className={`px-6 py-2 font-bold flex items-center gap-2 rounded-lg transition-all ${
                                    activeModalTab === 'next-steps' 
                                        ? 'bg-emerald-600 text-white shadow-lg' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <Clock size={18} /> Next Steps
                            </button>
                        </div>

                        {modalLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <Clock className="animate-spin mb-3 mx-auto text-blue-600" size={32} />
                                    <p className="text-slate-600 font-semibold">Loading details...</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Summary Tab */}
                                {activeModalTab === 'summary' && (
                                    <div className="space-y-6">
                                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                                            <h3 className="font-bold text-xl text-slate-900 mb-4 flex items-center gap-3">
                                                <User size={24} className="text-blue-600" />
                                                Doctor Information
                                            </h3>
                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div>
                                                    <p className="text-slate-700 font-semibold">Dr. {selectedConsultation.doctor_name || 'Unknown'}</p>
                                                    {selectedConsultation.specialization && (
                                                        <p className="text-sm text-slate-600 mt-1">{selectedConsultation.specialization}</p>
                                                    )}
                                                </div>
                                                <div className="text-right md:text-left">
                                                    <p className="text-sm text-slate-600">Date & Time</p>
                                                    <p className="text-slate-900 font-bold">
                                                        {new Date(selectedConsultation.consultation_date || selectedConsultation.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {selectedConsultation.consultation_fee && (
                                            <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm text-slate-600 font-semibold">Consultation Fee</p>
                                                        <p className="text-3xl font-black text-green-600">
                                                            ${parseFloat(selectedConsultation.consultation_fee).toFixed(2)}
                                                        </p>
                                                    </div>
                                                    <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 font-bold transition-all">
                                                        <Download size={18} /> Add to Bill
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Medicines Tab */}
                                {activeModalTab === 'medicines' && (
                                    <div className="space-y-4">
                                        {medicines.length === 0 ? (
                                            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                                <Pill size={48} className="mx-auto text-slate-300 mb-4" />
                                                <p className="text-slate-600 font-semibold text-lg">No medicines prescribed</p>
                                                <p className="text-slate-500">This consultation had no medication orders.</p>
                                            </div>
                                        ) : (
                                            medicines.map((med, idx) => (
                                                <div key={med.id || idx} className="bg-orange-50 p-6 rounded-xl border border-orange-200 hover:shadow-md transition-all">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center font-bold text-lg">
                                                                {med.medicine_name?.[0] || 'M'}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-xl text-slate-900">{med.medicine_name}</h4>
                                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                                    med.status === 'dispensed' 
                                                                        ? 'bg-emerald-100 text-emerald-800' 
                                                                        : 'bg-amber-100 text-amber-800'
                                                                }`}>
                                                                    {med.status || 'Pending'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {med.price && (
                                                            <p className="font-bold text-lg text-orange-600">${med.price}</p>
                                                        )}
                                                    </div>
                                                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-slate-500 font-semibold uppercase tracking-wide mb-1">Dosage</p>
                                                            <p className="text-slate-900 font-medium">{med.dosage || 'As directed'}</p>
                                                        </div>
                                                        {med.instructions && (
                                                            <div>
                                                                <p className="text-slate-500 font-semibold uppercase tracking-wide mb-1">Instructions</p>
                                                                <p className="text-slate-900">{med.instructions}</p>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-slate-500 font-semibold uppercase tracking-wide mb-1">Prescribed By</p>
                                                            <p className="text-slate-900">{med.doctor_name}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500 font-semibold uppercase tracking-wide mb-1">Date</p>
                                                            <p className="text-slate-900 text-sm">{new Date(med.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Lab Tests Tab */}
                                {activeModalTab === 'lab-tests' && (
                                    <div className="space-y-4">
                                        {labTests.length === 0 ? (
                                            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                                <Beaker size={48} className="mx-auto text-slate-300 mb-4" />
                                                <p className="text-slate-600 font-semibold text-lg">No lab tests for this consultation</p>
                                            </div>
                                        ) : (
                                            labTests.map((test) => (
                                                <div key={test.id} className="bg-purple-50 p-6 rounded-xl border border-purple-200 hover:shadow-md transition-all">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center font-bold text-lg">
                                                                LT
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-xl text-slate-900">{test.test_name}</h4>
                                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                                    Completed
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {test.cost && (
                                                            <p className="font-bold text-lg text-purple-600">${test.cost}</p>
                                                        )}
                                                    </div>
                                                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-slate-500 font-semibold uppercase tracking-wide mb-1">Doctor</p>
                                                            <p className="text-slate-900">{test.doctor_name}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500 font-semibold uppercase tracking-wide mb-1">Completed</p>
                                                            <p className="text-slate-900">{new Date(test.completed_date).toLocaleDateString()}</p>
                                                        </div>
                                                        {test.results && (
                                                            <div className="md:col-span-2">
                                                                <p className="text-slate-500 font-semibold uppercase tracking-wide mb-1">Results Summary</p>
                                                                <p className="text-slate-900 bg-white p-3 rounded-lg">{test.results}</p>
                                                            </div>
                                                        )}
                                                        {test.report_path && (
                                                            <div className="md:col-span-2 pt-2">
                                                                <a
                                                                    href={`http://localhost:5000/${test.report_path}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all"
                                                                >
                                                                    <Download size={16} />
                                                                    View Full Report PDF
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Next Steps Tab */}
                                {activeModalTab === 'next-steps' && (
                                    <div className="space-y-6">
                                        {nextConsult ? (
                                            <div className="bg-emerald-50 p-8 rounded-2xl border-2 border-emerald-200">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                                                        {nextConsult.appointment_date ? new Date(nextConsult.appointment_date).getDate() : 'FU'}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-black text-emerald-800">Next Consultation Required</h3>
                                                        <p className="text-emerald-700 mt-2 font-semibold">
                                                            {nextConsult.appointment_date 
                                                                ? `Scheduled for ${new Date(nextConsult.appointment_date).toLocaleDateString()}`
                                                                : nextConsult.instructions
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-6 rounded-xl border border-emerald-100">
                                                    <p className="text-slate-700">
                                                        <strong>Recommendation:</strong> Schedule your follow-up appointment soon to continue treatment.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50 p-8 rounded-2xl border-2 border-slate-200 text-center">
                                                <AlertCircle size={64} className="mx-auto text-slate-400 mb-4" />
                                                <h3 className="text-xl font-bold text-slate-600 mb-2">No Follow-up Scheduled</h3>
                                                <p className="text-slate-500 max-w-md mx-auto">
                                                    Contact your doctor if you need a follow-up consultation. No upcoming appointments detected.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        <div className="flex justify-end gap-3 pt-6 border-t mt-8">
                            <button
                                onClick={() => setShowDetails(false)}
                                className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default ConsultationHistory;

