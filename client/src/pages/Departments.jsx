import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Building2, Plus, Trash2, Edit } from 'lucide-react';

const Departments = () => {
    const [departments, setDepartments] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '' });

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments');
            setDepartments(res.data.departments);
        } catch (err) {
            toast.error('Failed to load departments');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/departments', formData);
            toast.success('Department added');
            setShowModal(false);
            setFormData({ name: '', description: '' });
            fetchDepartments();
        } catch (err) {
            toast.error('Failed to add department');
        }
    };

    const deleteDept = async (id) => {
        if (window.confirm('Are you sure you want to delete this department?')) {
            try {
                await api.delete(`/departments/${id}`);
                toast.success('Department deleted');
                fetchDepartments();
            } catch (err) {
                toast.error('Failed to delete department');
            }
        }
    };

    return (
        <div className="space-y-10 animate-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/10">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40">
                        <Building2 size={40} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Medical Units</h1>
                        <p className="text-slate-500 mt-1 font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            Specialized Care & Clinical Divisions
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary group px-8"
                >
                    <Plus size={20} className="transition-transform group-hover:scale-110" />
                    New Department
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {departments.map((dept) => (
                    <div key={dept.id} className="card-hover group bg-white rounded-[2.5rem] border border-slate-200/60 shadow-lg shadow-slate-200/20 overflow-hidden flex flex-col h-full">
                        <div className="p-10 flex-1">
                            <div className="flex justify-between items-start mb-8">
                                <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-[1.5rem] shadow-sm group-hover:scale-110 transition-transform">
                                    <Building2 size={32} />
                                </div>
                                <button
                                    onClick={() => deleteDept(dept.id)}
                                    className="w-10 h-10 bg-white shadow-xl border border-slate-100 text-red-600 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight">{dept.name}</h3>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed">{dept.description}</p>
                        </div>
                        <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Active Division</span>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">New Department</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input
                                    className="input-field"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    className="input-field min-h-[100px]"
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 btn-primary">
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Departments;
