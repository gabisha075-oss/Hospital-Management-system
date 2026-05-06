import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FileText, Download, Calendar, Search, Pill } from 'lucide-react';
import ConsultationHistory from '../components/ConsultationHistory';

const PatientReports = () => {
    const [reports, setReports] = useState([]);
    const [patientId, setPatientId] = useState(null);
    const [loading, setLoading] = useState(true);
const [activeTab, setActiveTab] = useState('reports');
    const [completedTests, setCompletedTests] = useState([]);

    useEffect(() => {
        fetchMyData();
    }, []);

    const fetchMyData = async () => {
        try {
            setLoading(true);
            console.log('🔄 Fetching patient profile...');
            
            const profileRes = await api.get('/patients/profile/me');
            const me = profileRes.data.patient;
            console.log('✅ Patient loaded:', me.id, me.name);
            setPatientId(me.id);

            if (me) {
                console.log(`🔄 Fetching reports for patient ${me.id}...`);
                const [res, testsRes] = await Promise.all([
                    api.get(`/lab/patient/${me.id}`),
                    api.get(`/lab-tests/patient/${me.id}/completed`)
                ]);
                
                console.log('✅ Lab reports response:', res.data.reports?.length || 0, 'reports');
                console.log('✅ Completed tests response:', testsRes.data.tests?.length || 0, 'tests');
                
                setReports(res.data.reports || []);
                setCompletedTests(testsRes.data.tests || []);
            }
        } catch (err) {
            console.error('❌ Detailed error in PatientReports:', {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data,
                url: err.config?.url
            });
            
            const errorMsg = err.response?.data?.message || err.response?.statusText || 'Failed to load reports and tests';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = () => {
        console.log('🔄 Manual refresh triggered');
        fetchMyData();
    };

    return (
        <div className="space-y-10 animate-in pb-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/10">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-purple-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/40">
                        <FileText size={40} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Medical Records & Diagnostics</h1>
                        <p className="text-slate-500 mt-1 font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                            Consultation history, lab reports, and clinical results
                        </p>
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-6 py-3 font-bold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'reports'
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <FileText size={18} /> Lab Reports
                </button>
                <button
                    onClick={() => setActiveTab('lab-tests')}
                    className={`px-6 py-3 font-bold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'lab-tests'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <FileText size={18} /> Lab Tests
                </button>
                <button
                    onClick={() => setActiveTab('consultations')}
                    className={`px-6 py-3 font-bold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'consultations'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                >
                <Pill size={18} /> Consultation History
                </button>
                <button
                    onClick={refreshData}
                    className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg"
                    title="Refresh reports"
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Lab Reports Tab */}
            {activeTab === 'reports' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {reports.map(report => (
                        <div key={report.id} className="card-hover group bg-white rounded-[2rem] border border-slate-200/60 shadow-lg shadow-slate-200/20 overflow-hidden relative">
                            <div className="p-8 pb-4">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all duration-500 shadow-sm border border-purple-100">
                                        <FileText size={28} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ID-RPT-{report.id}</p>
                                </div>
                                <h3 className="font-black text-xl text-slate-900 mb-2">Diagnostic Outcome</h3>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                                    <Calendar size={14} className="text-purple-400" />
                                    {new Date(report.created_at || report.uploaded_at || Date.now()).toLocaleDateString(undefined, {
                                        month: 'short', day: 'numeric', year: 'numeric'
                                    })}
                                </div>
                            </div>
                            <div className="p-8 pt-0">
                                    <a
href={`/uploads/${report.file_path.replace(/^uploads[\/\\]/, '').replace(/\\/g, '/')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-slate-900 hover:bg-black text-white w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 group/btn"
                                >
                                    <Download size={18} className="group-hover/btn:translate-y-1 transition-transform" />
                                    Secure Access
                                </a>
                            </div>
                        </div>
                    ))}
                    {reports.length === 0 && !loading && (
                        <div className="col-span-full card border-dashed py-16 flex flex-col items-center justify-center text-slate-400">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p>No lab reports found in your records.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Lab Tests Tab */}
            {activeTab === 'lab-tests' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {completedTests.map(test => (
                        <div key={test.id} className="card-hover group bg-white rounded-[2rem] border border-slate-200/60 shadow-lg shadow-slate-200/20 overflow-hidden relative">
                            <div className="p-8 pb-4">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-sm border border-emerald-100">
                                        <FileText size={28} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">TEST-ID-{test.id}</p>
                                </div>
                                <h3 className="font-black text-xl text-slate-900 mb-2 line-clamp-2">{test.test_name}</h3>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                    <Calendar size={14} className="text-emerald-400" />
                                    {test.completed_date ? new Date(test.completed_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending Report'}
                                </div>
                                {test.doctor_name && (
                                    <p className="text-sm text-slate-600 mb-2">Doctor: {test.doctor_name}</p>
                                )}
                                {test.results && (
                                    <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg mb-4 line-clamp-3">
                                        {test.results}
                                    </div>
                                )}
                            </div>
                            <div className="p-8 pt-0">
                                {test.report_path ? (
                                    <a
href={`/uploads/${test.report_path?.replace(/^uploads[\/\\]/, '').replace(/\\/g, '/') || ''}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-200/50 group/btn"
                                    >
                                        <Download size={18} className="group-hover/btn:translate-y-1 transition-transform" />
                                        View Report PDF
                                    </a>
                                ) : (
                                    <div className="bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold text-sm text-center">
                                        Report not yet uploaded
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {completedTests.length === 0 && !loading && (
                        <div className="col-span-full card border-dashed py-16 flex flex-col items-center justify-center text-slate-400">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p>No completed lab tests found.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Consultation History Tab */}
            {activeTab === 'consultations' && patientId && (
                <ConsultationHistory patientId={patientId} />
            )}
        </div>
    );
};


export default PatientReports;
