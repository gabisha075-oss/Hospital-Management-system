import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Calendar, CreditCard, FileText, Plus, UserCircle2, Activity, Clock, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';

const PatientDashboard = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyAppointments();
    }, []);

    const fetchMyAppointments = async () => {
        try {
            const res = await api.get('/appointments/my');
            setAppointments(res.data.appointments);
        } catch (err) {
            toast.error('Failed to sync appointment data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10 animate-in pb-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/10">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40">
                        <UserCircle2 size={40} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Health Hub</h1>
                        <p className="text-slate-500 mt-1 font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            Welcome back to your medical cockpit
                        </p>
                    </div>
                </div>
                <Link to="/patient/book" className="btn-primary flex items-center gap-3 px-8 group">
                    <Plus size={20} className="transition-transform group-hover:rotate-90" />
                    Secure New Consult
                </Link>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Link to="/patient" className="card-hover bg-white p-8 rounded-[2rem] border border-slate-200 text-center flex flex-col items-center justify-center gap-6 group">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm">
                        <Calendar size={32} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-slate-900 mb-1">Clinic Visits</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Appointment Matrix</p>
                    </div>
                </Link>
                <Link to="/patient/bills" className="card-hover bg-white p-8 rounded-[2rem] border border-slate-200 text-center flex flex-col items-center justify-center gap-6 group">
                    <div className="w-20 h-20 bg-green-50 text-green-600 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 group-hover:bg-green-600 group-hover:text-white transition-all duration-500 shadow-sm">
                        <CreditCard size={32} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-slate-900 mb-1">Accounts</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Financial Records</p>
                    </div>
                </Link>
                <Link to="/patient/reports" className="card-hover bg-white p-8 rounded-[2rem] border border-slate-200 text-center flex flex-col items-center justify-center gap-6 group">
                    <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-500 shadow-sm">
                        <FileText size={32} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-slate-900 mb-1">Diagnostics</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Clinical Reports</p>
                    </div>
                </Link>
            </div>

            <div className="card overflow-hidden">
                <div className="p-6 px-10 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                        <Activity size={22} className="text-blue-600" />
                        Live Consultation Queue
                    </h3>
                    <div className="flex gap-2">
                        <span className="badge bg-blue-100 text-blue-700">Synchronized</span>
                    </div>
                </div>
                <div className="divide-y divide-slate-50">
                    {appointments.map(appt => (
                        <div key={appt.id} className="flex items-center justify-between p-8 hover:bg-slate-50/50 transition-all group">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-white border border-slate-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm group-hover:scale-110 transition-transform">
                                    {appt.doctor_name[0]}
                                </div>
                                <div>
                                    <h4 className="font-black text-xl text-slate-900">Dr. {appt.doctor_name}</h4>
                                    <p className="text-sm font-bold text-slate-400 flex items-center gap-2 mt-1">
                                        <Clock size={14} />
                                        {new Date(appt.appointment_date).toLocaleString(undefined, {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-tighter shadow-sm ${appt.status === 'approved'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-orange-50 text-orange-600'
                                    }`}>
                                    {appt.status}
                                </span>
                                <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    ))}
                    {appointments.length === 0 && (
                        <div className="text-center py-24">
                            <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-lg font-bold text-slate-700">No appointments scheduled</p>
                            <p className="text-slate-400 text-sm">Your health queue is currently clear</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PatientDashboard;
