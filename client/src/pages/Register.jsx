import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Building2, User, Mail, Lock, Send } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'patient',
        patient_type: 'outpatient',
        age: '',
        gender: '',
        blood_group: '',
        phone: '',
        address: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/register', formData);
            toast.success('Account established. You can now authenticate.');
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Enrollment failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 animate-in relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400/10 blur-[120px] rounded-full"></div>

            <div className="max-w-xl w-full relative z-10">
                <div className="bg-white rounded-[3rem] shadow-2xl p-12 md:p-16 border border-slate-200/60 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

                    <div className="text-center mb-10">
                        <Link to="/" className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[2.5rem] mb-8 shadow-2xl shadow-indigo-500/40 transform hover:scale-110 transition-transform duration-500">
                            <User size={48} strokeWidth={1} />
                        </Link>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4">Health<span className="text-blue-600">Quest</span></h1>
                        <div className="flex items-center justify-center gap-2">
                            <div className="h-px w-8 bg-slate-200"></div>
                            <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Patient Enrollment Portal</p>
                            <div className="h-px w-8 bg-slate-200"></div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 px-1">Legal Name</label>
                            <div className="relative group">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 h-16 rounded-2xl pl-14 pr-6 text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg"
                                    placeholder="Enter full name"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 px-1">Contact Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 h-16 rounded-2xl pl-14 pr-6 text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg"
                                    type="email"
                                    placeholder="patient@medical.com"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 px-1">Passphrase</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 h-16 rounded-2xl pl-14 pr-6 text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Patient-specific fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 px-1">Patient Type</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 h-16 rounded-2xl px-6 text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg"
                                    value={formData.patient_type}
                                    onChange={(e) => setFormData({ ...formData, patient_type: e.target.value })}
                                >
                                    <option value="outpatient">Outpatient</option>
                                    <option value="inpatient">Inpatient</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 px-1">Age</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 h-16 rounded-2xl px-6 text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg"
                                    type="number"
                                    placeholder="Age"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 px-1">Gender</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 h-16 rounded-2xl px-6 text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 px-1">Blood Group</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 h-16 rounded-2xl px-6 text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg"
                                    value={formData.blood_group}
                                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                                >
                                    <option value="">Select Blood Group</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 px-1">Phone Number</label>
                            <input
                                className="w-full bg-slate-50 border border-slate-200 h-16 rounded-2xl px-6 text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg"
                                type="tel"
                                placeholder="Phone number"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 px-1">Address</label>
                            <textarea
                                className="w-full bg-slate-50 border border-slate-200 h-20 rounded-2xl px-6 py-4 text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg resize-none"
                                placeholder="Full address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                rows="2"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-black text-white h-16 rounded-2xl text-xl font-black tracking-tight flex items-center justify-center gap-3 mt-10 shadow-2xl shadow-slate-200 transition-all active:scale-[0.98] group"
                        >
                            {loading ? (
                                <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Establish Records
                                    <Send size={20} className="group-hover:translate-x-1 group-hover:translate-y-[-1px] transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center pt-8 border-t border-slate-100">
                        <p className="text-slate-500 font-semibold text-sm">
                            Already enrolled? <Link to="/login" className="text-blue-600 font-black hover:text-blue-700 ml-1 underline decoration-2 underline-offset-4">Authorize Now</Link>
                        </p>
                    </div>
                </div>
                <div className="mt-8 flex justify-center gap-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        Encrypted Storage
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
