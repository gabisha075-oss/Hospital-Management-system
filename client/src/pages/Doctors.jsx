import { useEffect, useState, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import { UserRound, Plus, ShieldCheck, Stethoscope, Trash2 } from 'lucide-react';

const Doctors = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const handleDeleteClick = (id) => {
        setDeleteDoctorId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteDoctorId) return;
        setDeleting(true);
        try {
            await api.delete(`/doctors/${deleteDoctorId}`);
            toast.success('Doctor deleted successfully');
            setShowDeleteModal(false);
            setDeleteDoctorId(null);
            fetchDoctors();
        } catch (err) {
            toast.error('Failed to delete doctor');
        } finally {
            setDeleting(false);
        }
    };
    const [doctors, setDoctors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteDoctorId, setDeleteDoctorId] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'doctor',
        department_id: '', specialization: '', experience: ''
    });

    useEffect(() => {
        fetchDoctors();
        fetchDepartments();
    }, []);

    const fetchDoctors = async () => {
        try {
            const res = await api.get('/doctors');
            setDoctors(res.data.doctors);
        } catch (err) { toast.error('Failed to load doctors'); }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments');
            setDepartments(res.data.departments);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // 1. Register user
            const userRes = await api.post('/auth/register', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: 'doctor',
                department_id: formData.department_id,
                specialization: formData.specialization,
                experience: formData.experience
            });

            // In a real flow, the register endpoint should return the userId
            // For this simplified flow, we assume register is successful and the admin can now add details
            // Ideally, the register endpoint handles this, or we need to find the user.

            toast.success('Doctor registered successfully and linked to department');
            setShowModal(false);
            fetchDoctors();
        } catch (err) {
            toast.error('Failed to register doctor');
        }
    };

    return (
        <div className="space-y-10 animate-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/10">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40">
                        <Stethoscope size={40} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Practitioner Portal</h1>
                        <p className="text-slate-500 mt-1 font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            Medical Staff & Specialization Directory
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary group px-8"
                >
                    <Plus size={20} className="transition-transform group-hover:scale-110" />
                    Board New Doctor
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {doctors.map(doctor => (
                    <div key={doctor.id} className="card-hover group bg-white rounded-[2.5rem] border border-slate-200/60 shadow-lg shadow-slate-200/20 overflow-hidden relative">
                        <div className="p-10 pb-6">
                            <div className="flex justify-between items-start mb-8">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl shadow-blue-200 group-hover:scale-110 transition-transform">
                                    {doctor.name[0]}
                                </div>
                                <span className={`px-4 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-widest shadow-sm ${doctor.availability_status ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {doctor.availability_status ? 'Available' : 'On Leave'}
                                </span>
                            </div>

                            <h3 className="font-black text-2xl text-slate-900 mb-1">Dr. {doctor.name}</h3>
                            <p className="text-blue-600 font-bold text-sm tracking-tight mb-4 uppercase">{doctor.specialization}</p>

                            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <ShieldCheck size={16} className="text-blue-500" />
                                <span className="text-xs font-black text-slate-600 uppercase tracking-tighter">{doctor.department_name}</span>
                            </div>
                        </div>

                        <div className="px-10 pb-10 flex items-center justify-between border-t border-slate-50 pt-6 mt-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Experience</p>
                                <p className="text-lg font-black text-slate-800">{doctor.experience}+ Years</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registry Email</p>
                                <p className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{doctor.email}</p>
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={() => handleDeleteClick(doctor.id)}
                                    className="absolute top-6 right-6 p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl shadow-lg hover:shadow-xl transition-all group opacity-0 group-hover:opacity-100"
                                    title="Delete Doctor"
                                >
                                    <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Stethoscope size={24} className="text-blue-700" /> Professional Registration
                        </h2>
                        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input className="input-field" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input className="input-field" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                <input className="input-field" type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                <select className="input-field" required value={formData.department_id} onChange={e => setFormData({ ...formData, department_id: e.target.value })}>

                                    <option value="">Select Dept</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Specialization</label>
                                <input className="input-field" required value={formData.specialization} onChange={e => setFormData({ ...formData, specialization: e.target.value })} />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Experience (Years)</label>
                                <input className="input-field" type="number" required value={formData.experience} onChange={e => setFormData({ ...formData, experience: e.target.value })} />
                            </div>
                            <div className="col-span-2 flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 btn-primary">Register Doctor</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md p-8 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={40} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Delete Doctor?</h3>
                            <p className="text-slate-500">This will permanently remove Dr. from the system and all associated appointments.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeleteDoctorId(null); }}
                                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-all"
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex-1 btn-danger py-2.5 font-medium transition-all disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Doctors;
