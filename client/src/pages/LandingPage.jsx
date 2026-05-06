import { Link } from 'react-router-dom';
import {
    ChevronRight,
    ShieldCheck,
    Activity,
    Clock,
    Users,
    Stethoscope,
    FlaskConical,
    Pill,
    Smartphone,
    Heart
} from 'lucide-react';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Activity className="text-white" size={24} />
                        </div>
                        <span className="text-xl font-black text-slate-900 tracking-tight">HealthQuest</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Features</a>
                        <a href="#departments" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Specialties</a>
                        <Link to="/login" className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors border-l border-slate-200 pl-8">Login</Link>
                        <Link to="/register" className="btn-primary py-2.5 px-6 text-sm">Join Network</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-30">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400 blur-[120px] rounded-full animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-400 blur-[100px] rounded-full animate-pulse delay-700"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full mb-8 animate-in slide-in-from-bottom duration-700">
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>
                        <span className="text-[10px] font-black uppercase text-blue-700 tracking-widest leading-none">The Future of Care is Here</span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tight leading-[0.95] mb-8 animate-in slide-in-from-bottom duration-1000">
                        Modern Care for <br />
                        <span className="text-blue-600">Unified Health.</span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 font-medium leading-relaxed mb-12 animate-in slide-in-from-bottom duration-1000 delay-150">
                        HealthQuest is the all-in-one enterprise platform for hospitals, patients, and practitioners. Experience absolute synchronization across every clinical touchpoint.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in slide-in-from-bottom duration-1000 delay-300">
                        <Link to="/register" className="btn-primary py-5 px-10 text-lg group w-full sm:w-auto">
                            Get Started Now
                            <ChevronRight className="ml-2 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <Link to="/login" className="btn-secondary py-5 px-10 text-lg bg-white w-full sm:w-auto">
                            Partner Login
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto border-t border-slate-200/50 pt-20 animate-in fade-in duration-1000 delay-500">
                        <div>
                            <p className="text-4xl font-black text-slate-900 leading-none mb-2">50k+</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Patients Sync'd</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-slate-900 leading-none mb-2">99.9%</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Uptime SLA</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-slate-900 leading-none mb-2">120+</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Specialists</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-slate-900 leading-none mb-2">0.5s</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Latent Sync</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features section */}
            <section id="features" className="py-32 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">Engineered for Excellence</h2>
                        <p className="text-slate-500 font-medium max-w-2xl mx-auto">No more silos. Our integrated ecosystem connects every role with real-time data precision.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-200 group-hover:scale-110 transition-transform">
                                <ShieldCheck size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-4">Secure Records</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">Multi-layer encryption and role-based access control ensure patient data remains confidential and audit-ready.</p>
                        </div>
                        <div className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-200 group-hover:scale-110 transition-transform">
                                <Smartphone size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-4">Mobile Ready</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">Book appointments, view prescriptions, and access diagnostics from any device, anywhere in the world.</p>
                        </div>
                        <div className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                            <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-emerald-200 group-hover:scale-110 transition-transform">
                                <Clock size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-4">Instant Sync</h3>
                            <p className="text-slate-500 font-medium leading-relaxed">Lab results and pharmacy prescriptions update in real-time, eliminating wait times and administrative errors.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Specializations */}
            <section id="departments" className="py-32 bg-slate-50 overflow-hidden relative">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
                        <div className="max-w-xl">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 block">Medical Core</span>
                            <h2 className="text-4xl md:text-6xl font-black text-slate-900 leading-none">Clinical Domains Beyond Standard.</h2>
                        </div>
                        <Link to="/register" className="btn-secondary bg-white px-8 py-4">Explore All Units</Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col items-center text-center group cursor-pointer hover:shadow-xl transition-all">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Stethoscope size={30} />
                            </div>
                            <span className="font-black text-slate-900 uppercase text-xs tracking-widest">General medicine</span>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col items-center text-center group cursor-pointer hover:shadow-xl transition-all">
                            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-all">
                                <FlaskConical size={30} />
                            </div>
                            <span className="font-black text-slate-900 uppercase text-xs tracking-widest">Laboratory</span>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col items-center text-center group cursor-pointer hover:shadow-xl transition-all">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                <Pill size={30} />
                            </div>
                            <span className="font-black text-slate-900 uppercase text-xs tracking-widest">Pharmacy</span>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col items-center text-center group cursor-pointer hover:shadow-xl transition-all">
                            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-rose-600 group-hover:text-white transition-all">
                                <Heart size={30} />
                            </div>
                            <span className="font-black text-slate-900 uppercase text-xs tracking-widest">Diagnostics</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA section */}
            <section className="py-32 px-6">
                <div className="max-w-5xl mx-auto rounded-[3rem] bg-slate-900 p-12 md:p-24 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full"></div>

                    <div className="relative z-10">
                        <Users className="mx-auto text-blue-500 mb-8" size={60} />
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-8">Ready to revolutionize <br /> your health experience?</h2>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link to="/register" className="btn-primary py-5 px-12 text-xl w-full sm:w-auto">I'm a Patient</Link>
                            <Link to="/login" className="btn-secondary py-5 px-12 text-xl bg-white/10 text-white border-white/10 hover:bg-white/20 w-full sm:w-auto">Hospital Staff</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-slate-200/60 bg-white px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <Activity className="text-white" size={18} />
                            </div>
                            <span className="text-lg font-black text-slate-900">HealthQuest</span>
                        </div>
                        <p className="text-slate-500 font-medium max-w-sm mb-8">Redefining health management through synchronized intelligence and compassionate design.</p>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center cursor-pointer text-slate-400">
                                <Smartphone size={20} />
                            </div>
                            <div className="w-10 h-10 bg-slate-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center cursor-pointer text-slate-400">
                                <Users size={20} />
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-6">Platform</h4>
                        <ul className="space-y-4">
                            <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600">Patient Portal</a></li>
                            <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600">Staff Dashboard</a></li>
                            <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600">API Access</a></li>
                            <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600">Security</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-6">Connect</h4>
                        <ul className="space-y-4">
                            <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600">Help Center</a></li>
                            <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600">Contact Support</a></li>
                            <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600">Careers</a></li>
                            <li><a href="#" className="text-sm font-bold text-slate-500 hover:text-blue-600">System Status</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto pt-20 mt-20 border-t border-slate-100 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">© 2026 HealthQuest Enterprise HMS. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
