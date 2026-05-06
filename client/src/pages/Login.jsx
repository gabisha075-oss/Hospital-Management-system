import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Building2, Mail, Lock } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await login(email, password);
            toast.success('Access granted. Welcome back!');
            navigate(`/${data.user.role}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 animate-in relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 blur-[120px] rounded-full"></div>

            <div className="max-w-xl w-full relative z-10">
                <div className="bg-white rounded-[3rem] shadow-2xl p-12 md:p-16 border border-slate-200/60 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

                    <div className="text-center mb-12">
                        <Link to="/" className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2.5rem] mb-8 shadow-2xl shadow-blue-500/40 transform hover:scale-110 transition-transform duration-500">
                            <Building2 size={48} strokeWidth={1} />
                        </Link>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4">Health<span className="text-blue-600">Quest</span></h1>
                        <div className="flex items-center justify-center gap-2">
                            <div className="h-px w-8 bg-slate-200"></div>
                            <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Medical Command Center</p>
                            <div className="h-px w-8 bg-slate-200"></div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 px-1">Registry Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 h-16 rounded-2xl pl-14 pr-6 text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg"
                                    placeholder="Enter clinic email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-2 px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secret Vault Key</label>
                                <Link to="#" className="text-[10px] font-black text-blue-600 uppercase hover:underline">Reset</Link>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 h-16 rounded-2xl pl-14 pr-6 text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-lg"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
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
                                    Authorize Access
                                    <Lock size={20} className="group-hover:translate-y-[-2px] transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center pt-8 border-t border-slate-100">
                        <p className="text-slate-500 font-semibold text-sm">
                            Need a patient account? <Link to="/register" className="text-blue-600 font-black hover:text-blue-700 ml-1 underline decoration-2 underline-offset-4">Register Now</Link>
                        </p>
                    </div>
                </div>
                <div className="mt-8 flex justify-center gap-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tier-4 Security</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">HL7 Compliant</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Encrypted Sync</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
