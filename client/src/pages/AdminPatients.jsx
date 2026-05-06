import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Users, Search, X, Trash2 } from 'lucide-react';

const AdminPatients = () => {
    const { user } = useAuth();
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePatientId, setDeletePatientId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async (search = '') => {
        try {
            const params = search ? `?search=${encodeURIComponent(search)}` : '';
            const res = await api.get(`/patients${params}`);
            setPatients(res.data.patients);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load patients');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchPatients(searchTerm);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/patients/${deletePatientId}`);
            toast.success('Patient deleted successfully');
            fetchPatients(searchTerm);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
            setDeletePatientId(null);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading patients...</div>;
    }

    return (
        <div className="space-y-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/10">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-red-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-red-500/40">
                        <Users size={40} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Patient Management</h1>
                        <p className="text-slate-500 mt-1 font-semibold">Admin - View all patients & delete</p>
                    </div>
                </div>
                <div className="flex gap-4 p-2 bg-slate-50 rounded-2xl">
                    <div className="px-6 py-2 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Total Patients</p>
                        <p className="text-xl font-black text-slate-900">{patients.length}</p>
                    </div>
                </div>
            </header>

            <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Search size={18} />
                    Search Patients
                </label>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="input-field pl-12 pr-12 w-full max-w-lg h-12"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {patients.map(p => (
                    <div key={p.id} className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-2">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-2xl">
                                {p.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-xl text-slate-900 truncate">{p.name}</h3>
                                <p className="text-sm text-slate-500 truncate">{p.email}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wide">Age</p>
                                <p className="text-lg font-bold text-slate-900">{p.age || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wide">Blood</p>
                                <p className="text-lg font-bold text-red-600">{p.blood_group || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wide">Phone</p>
                                <p className="text-lg font-bold text-slate-900">{p.phone || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wide">Type</p>
                                <p className="text-lg font-bold text-slate-900">{p.patient_type || 'N/A'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setDeletePatientId(p.id);
                                setShowDeleteModal(true);
                            }}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-6 font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all rounded-xl"
                        >
                            <Trash2 size={18} />
                            Delete Patient
                        </button>
                    </div>
                ))}
            </div>

            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Confirm Delete</h2>
                        <p className="text-slate-600 mb-6">Permanently delete this patient and all associated records? Cannot be undone.</p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3 px-4 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                            >
                                {deleting ? 'Deleting...' : 'Delete Patient'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPatients;
