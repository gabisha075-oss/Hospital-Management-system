import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Pill, Plus, AlertTriangle, TrendingUp, ClipboardList, CheckCircle, Package, Trash2, Edit, Clock } from 'lucide-react';

const PharmacistDashboard = () => {
    const [medicines, setMedicines] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [activeTab, setActiveTab] = useState('prescriptions');
    const [showStockModal, setShowStockModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ id: '', name: '', stock: '', price: '', expiry_date: '' });

    useEffect(() => {
        const loadData = async () => {
            await Promise.allSettled([fetchMedicines(), fetchPrescriptions()]);
        };
        loadData();
    }, []);

    const fetchMedicines = async () => {
        try {
            const res = await api.get('/pharmacy/medicines');
            setMedicines(res.data.medicines);
        } catch (err) { toast.error('Failed to load inventory'); }
    };

    const fetchPrescriptions = async () => {
        try {
            const res = await api.get('/prescriptions');
            setPrescriptions(res.data.prescriptions);
        } catch (err) { toast.error('Failed to load prescriptions'); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/pharmacy/medicines/${formData.id}`, formData);
                toast.success('Medicine updated');
            } else {
                await api.post('/pharmacy/medicines', formData);
                toast.success('Medicine added to inventory');
            }
            setShowStockModal(false);
            setFormData({ id: '', name: '', stock: '', price: '', expiry_date: '' });
            fetchMedicines();
        } catch (err) { toast.error('Operation failed'); }
    };

    const deleteMedicine = async (id) => {
        if (window.confirm('Are you sure you want to delete this medicine?')) {
            try {
                await api.delete(`/pharmacy/medicines/${id}`);
                toast.success('Medicine deleted');
                fetchMedicines();
            } catch (err) { toast.error('Delete failed'); }
        }
    };

    const dispensePrescription = async (id) => {
        try {
            await api.patch(`/prescriptions/${id}/dispense`);
            toast.success('Medicine dispensed correctly');
            fetchPrescriptions();
            fetchMedicines();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Dispense failed');
        }
    };

    const openEditModal = (m) => {
        setFormData({
            id: m.id,
            name: m.name,
            stock: m.stock,
            price: m.price,
            expiry_date: m.expiry_date.split('T')[0]
        });
        setIsEditing(true);
        setShowStockModal(true);
    };

    const parsePrescriptionMedicines = (prescription) => {
        if (!prescription?.medicines) return [];
        try {
            const parsed = Array.isArray(prescription.medicines)
                ? prescription.medicines
                : (typeof prescription.medicines === 'string' ? JSON.parse(prescription.medicines) : []);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const getPrescriptionMedicineLabel = (prescription) => {
        if (prescription?.medicine_name) return prescription.medicine_name;
        const parsedMeds = parsePrescriptionMedicines(prescription);
        if (parsedMeds.length === 0) return 'Medicine not specified';

        return parsedMeds
            .map((item) => {
                const inventoryMed = medicines.find((m) => Number(m.id) === Number(item.id));
                return inventoryMed?.name || `Medicine #${item.id}`;
            })
            .join(', ');
    };

    const getPrescriptionDosageLabel = (prescription) => {
        if (prescription?.dosage) return prescription.dosage;
        const parsedMeds = parsePrescriptionMedicines(prescription);
        const dosages = parsedMeds
            .map((item) => item?.dosage)
            .filter(Boolean);
        return dosages.length > 0 ? dosages.join(' | ') : 'As prescribed';
    };

    const getPrescriptionGuidanceLabel = (prescription) => {
        if (prescription?.instructions) return prescription.instructions;
        const parsedMeds = parsePrescriptionMedicines(prescription);
        const instructions = parsedMeds
            .map((item) => item?.instructions)
            .filter(Boolean);
        return instructions.length > 0 ? instructions.join(' | ') : 'Standard administration required';
    };

    return (
        <div className="space-y-10 animate-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/10">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40">
                        <Pill size={40} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Pharmacy Portal</h1>
                        <p className="text-slate-500 mt-1 font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            Medical Inventory Management System
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => setActiveTab(activeTab === 'inventory' ? 'prescriptions' : 'inventory')}
                        className="btn-secondary flex items-center gap-2 px-8"
                    >
                        {activeTab === 'inventory' ? <ClipboardList size={18} /> : <Package size={18} />}
                        {activeTab === 'inventory' ? 'Pending Orders' : 'Check Inventory'}
                    </button>
                    {activeTab === 'inventory' && (
                        <button onClick={() => { setIsEditing(false); setFormData({ id: '', name: '', stock: '', price: '', expiry_date: '' }); setShowStockModal(true); }} className="btn-primary group">
                            <Plus size={20} className="transition-transform group-hover:rotate-90" />
                            Add Formula
                        </button>
                    )}
                </div>
            </header>

            {activeTab === 'prescriptions' ? (
                <div className="card overflow-hidden">
                    <div className="p-6 px-10 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                            <ClipboardList size={22} className="text-blue-600" />
                            Pending Prescriptions queue
                        </h3>
                        <div className="flex gap-2">
                            <span className="badge bg-green-100 text-green-700">Verified</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white border-b border-slate-100">
                                    <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient & Doctor</th>
                                    <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Medical Asset</th>
                                    <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Guidance</th>
                                    <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Fulfillment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {prescriptions.map(p => (
                                    <tr key={p.id} className="group hover:bg-blue-50/40 transition-all">
                                        <td className="px-10 py-6">
                                            <div>
                                                <p className="font-extrabold text-slate-900">{p.patient_name}</p>
                                                <p className="text-xs font-bold text-blue-500 uppercase tracking-tighter">Dr. {p.doctor_name}</p>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white border border-slate-100 text-blue-600 rounded-xl flex items-center justify-center font-black">
                                                    <Pill size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-extrabold text-slate-900">{getPrescriptionMedicineLabel(p)}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Dosage: {getPrescriptionDosageLabel(p)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 max-w-xs">
                                            <p className="text-xs font-medium text-slate-600 italic leading-relaxed">
                                                {getPrescriptionGuidanceLabel(p)}
                                            </p>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            {p.status === 'pending' ? (
                                                <button
                                                    onClick={() => dispensePrescription(p.id)}
                                                    className="btn-primary flex items-center gap-2 py-2 px-6 text-xs ml-auto shadow-sm"
                                                >
                                                    <CheckCircle size={14} /> Dispense
                                                </button>
                                            ) : (
                                                <span className="badge bg-slate-100 text-slate-500">Fulfilled</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}
            {activeTab === 'inventory' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="card lg:col-span-3 overflow-hidden">
                        <div className="p-6 px-10 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                <Package size={22} className="text-blue-600" />
                                Inventory Ledger
                            </h3>
                            <button className="text-xs font-bold text-blue-600 hover:underline">Export CSV</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white border-b border-slate-100">
                                        <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Formula</th>
                                        <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Availability</th>
                                        <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Unit Price</th>
                                        <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Stability</th>
                                        <th className="px-10 py-5 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Options</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {medicines.map(m => (
                                        <tr key={m.id} className="group hover:bg-slate-50 transition-all">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">
                                                        <Pill size={16} />
                                                    </div>
                                                    <span className="font-extrabold text-slate-900">{m.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-sm font-black ${m.stock < 10 ? 'text-red-500' : 'text-slate-700'}`}>{m.stock} Units</span>
                                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${m.stock < 10 ? 'bg-red-500 w-1/4' : 'bg-blue-500 w-3/4'}`}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className="text-sm font-black text-slate-900">${m.price}</span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                                                    <Clock size={12} />
                                                    {new Date(m.expiry_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => openEditModal(m)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => deleteMedicine(m.id)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="card bg-blue-600 text-white border-none shadow-xl shadow-blue-200/50 p-8 overflow-hidden relative group">
                            <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-blue-500/20 transform -rotate-12 group-hover:scale-110 transition-transform" />
                            <p className="text-[11px] font-black text-blue-200 uppercase tracking-widest mb-4">Inventory Reach</p>
                            <p className="text-5xl font-black mb-2">{medicines.length}</p>
                            <p className="text-xs font-bold text-blue-100">Validated Formulae</p>
                        </div>

                        <div className="card p-8 bg-orange-50/50 border-orange-100">
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-[11px] font-black text-orange-600 uppercase tracking-widest">Priority Stock</p>
                                <AlertTriangle size={18} className="text-orange-500" />
                            </div>
                            <div className="space-y-4">
                                {medicines.filter(m => m.stock < 10).map(m => (
                                    <div key={m.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-orange-100 shadow-sm">
                                        <p className="text-xs font-black text-slate-800">{m.name}</p>
                                        <span className="text-[10px] font-black px-2 py-0.5 bg-red-50 text-red-600 rounded-lg">{m.stock} Left</span>
                                    </div>
                                ))}
                                {medicines.filter(m => m.stock < 10).length === 0 && (
                                    <div className="text-center py-6">
                                        <CheckCircle className="mx-auto text-green-500 mb-2" size={24} />
                                        <p className="text-xs font-bold text-slate-500">All levels optimal</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showStockModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">{isEditing ? 'Edit Medicine' : 'Inventory Addition'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Medicine Name</label>
                                <input className="input-field" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                                    <input className="input-field" type="number" required value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
                                    <input className="input-field" type="number" step="0.01" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                                <input className="input-field" type="date" required value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowStockModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 transition-colors font-medium">Cancel</button>
                                <button type="submit" className="flex-1 btn-primary">{isEditing ? 'Save Changes' : 'Add Item'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PharmacistDashboard;
