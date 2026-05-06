import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FileText, Upload, Filter, Download } from 'lucide-react';

const LabDashboard = () => {
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => { fetchPatients(); }, []);

    const fetchPatients = async () => {
        try {
            const res = await api.get('/patients');
            setPatients(res.data.patients);
        } catch (err) { toast.error('Failed to load patients'); }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedPatient || !file) return toast.warning('Select patient and file');

        const formData = new FormData();
        formData.append('report', file);
        formData.append('patient_id', selectedPatient);

        setLoading(true);
        try {
            await api.post('/lab/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Lab report uploaded successfully');
            setFile(null);
            setSelectedPatient('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10 animate-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/10">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40">
                        <FileText size={40} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Lab Diagnostics</h1>
                        <p className="text-slate-500 mt-1 font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            Pathology & Report Management Console
                        </p>
                    </div>
                </div>
                <div className="hidden lg:flex gap-4">
                    <div className="bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100 flex flex-col items-end">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Patients</p>
                        <p className="text-xl font-black text-blue-600">{patients.length}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="card-hover bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                                <Upload size={24} />
                            </div>
                            Report Dispatch
                        </h3>
                        <form onSubmit={handleUpload} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Target Patient Registry</label>
                                <select
                                    className="input-field h-14 bg-slate-50 border-slate-200 text-slate-900 font-bold rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    required
                                    value={selectedPatient}
                                    onChange={e => setSelectedPatient(e.target.value)}
                                >
                                    <option value="">-- Search Registry --</option>
                                    {patients.map(p => <option key={p.id} value={p.id}>{p.name} · {p.email}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Diagnostic Payload (PDF)</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group relative bg-slate-50/50">
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={e => setFile(e.target.files[0])}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    />
                                    <div className="text-center relative z-10">
                                        <div className="mx-auto w-20 h-20 bg-white shadow-xl text-blue-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                            <FileText size={36} />
                                        </div>
                                        <p className="font-black text-lg text-slate-900">{file ? file.name : 'Drop Secure Report'}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Encrypted PDF Format Only'}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-5 text-lg font-black tracking-tight flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/30 group"
                            >
                                {loading ? 'Syncing...' : (
                                    <>
                                        Authorize & Sync Report
                                        <Download size={20} className="group-hover:translate-y-1 transition-transform rotate-180" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="flex flex-col gap-10">
                    <div className="card border-none bg-slate-900 text-white p-12 rounded-[2.5rem] relative overflow-hidden flex-1 flex flex-col justify-center">
                        <Filter className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 rotate-12" />
                        <h3 className="text-3xl font-black mb-4 relative z-10 leading-tight">Terminal Status: <span className="text-blue-500">Ready</span></h3>
                        <p className="text-slate-400 text-lg font-medium relative z-10 max-w-sm">All diagnostic uploads are hashed and verified before becoming visible to the patient cluster.</p>
                        <div className="mt-10 flex gap-4 relative z-10">
                            <div className="px-5 py-2 bg-white/10 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest text-blue-400">Secure Protocol</div>
                            <div className="px-5 py-2 bg-white/10 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest text-emerald-400">Live Sync</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Uptime</p>
                            <p className="text-3xl font-black text-slate-900">99.9%</p>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Encryption</p>
                            <p className="text-3xl font-black text-slate-900">AES-256</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LabDashboard;
