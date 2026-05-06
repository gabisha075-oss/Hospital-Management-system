import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { UserPlus, Trash2, ShieldCheck, Mail, UserCircle2, Briefcase } from 'lucide-react';

const Staff = () => {
    const [staff, setStaff] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'receptionist' });

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const res = await api.get('/users');
            // Filter out admin and patient roles to show only support staff and doctors
            const supportRoles = ['receptionist', 'pharmacist', 'lab'];
            const filteredStaff = res.data.users.filter(u => supportRoles.includes(u.role));
            setStaff(filteredStaff);
        } catch (err) {
            toast.error('Failed to load staff members');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', formData);
            toast.success(`${formData.role} created successfully`);
            setShowModal(false);
            setFormData({ name: '', email: '', password: '', role: 'receptionist' });
            fetchStaff();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create staff account');
        }
    };

    const deleteStaff = async (id) => {
        if (window.confirm('Are you sure you want to remove this staff member?')) {
            try {
                await api.delete(`/users/${id}`);
                toast.success('Staff member removed');
                fetchStaff();
            } catch (err) {
                toast.error('Failed to delete staff member');
            }
        }
    };

    const roleColors = {
        receptionist: 'bg-emerald-100 text-emerald-700',
        pharmacist: 'bg-indigo-100 text-indigo-700',
        lab: 'bg-rose-100 text-rose-700'
    };

    return (
        <div className="space-y-10 animate-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/10">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40">
                        <Briefcase size={40} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Staff Operations</h1>
                        <p className="text-slate-500 mt-1 font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            Workforce Management & Credentials
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary group px-8"
                >
                    <UserPlus size={20} className="transition-transform group-hover:scale-110" />
                    Onboard New Staff
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {staff.map((member) => (
                    <div key={member.id} className="card-hover group bg-white rounded-[2rem] border border-slate-200/60 shadow-lg shadow-slate-200/20 overflow-hidden relative p-8">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => deleteStaff(member.id)}
                                className="w-10 h-10 bg-white shadow-xl border border-slate-100 text-red-600 rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 rounded-[1.5rem] flex items-center justify-center font-black text-3xl shadow-inner mb-6 ring-4 ring-slate-50">
                                {member.name[0]}
                            </div>
                            <h3 className="font-black text-xl text-slate-900 leading-tight mb-2 uppercase">{member.name}</h3>
                            <span className={`px-4 py-1 rounded-xl text-[10px] uppercase font-black tracking-[0.1em] shadow-sm ${roleColors[member.role]}`}>
                                {member.role === 'lab' ? 'Lab Technician' : member.role}
                            </span>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-slate-50">
                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <Mail size={16} className="text-slate-400 shrink-0" />
                                <span className="text-sm font-bold text-slate-600 truncate">{member.email}</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">
                                <ShieldCheck size={14} />
                                Verified Personnel
                            </div>
                        </div>
                    </div>
                ))}
                {staff.length === 0 && (
                    <div className="col-span-full card border-dashed py-12 text-center text-slate-400 italic">
                        No support staff accounts found. Use the button above to add members.
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-800">Add Staff Member</h2>
                            <p className="text-slate-500 text-sm">Create credentials for medical support teams</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Full Name</label>
                                <div className="relative">
                                    <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        className="input-field pl-10 h-12"
                                        placeholder="Enter name"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                                        placeholder="email@hospital.com"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Access Role</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <select
                                        className="input-field pl-10 h-12"
                                        required
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="receptionist">Receptionist</option>
                                        <option value="pharmacist">Pharmacist</option>
                                        <option value="lab">Lab Technician</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Initial Password</label>
                                <input
                                    className="input-field h-12"
                                    type="password"
                                    placeholder="Minimum 6 characters"
                                    required
                                    minLength={6}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 h-12 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 h-12 btn-primary shadow-lg shadow-blue-700/20">
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Staff;
