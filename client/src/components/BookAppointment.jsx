import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
    Calendar,
    User,
    Clock,
    Check,
    Stethoscope,
    Search,
    ChevronRight,
    Building2,
    ShieldCheck
} from 'lucide-react';

const BookAppointment = () => {
    const [doctors, setDoctors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [formData, setFormData] = useState({ doctor_id: '', appointment_date: '' });
    const [patientData, setPatientData] = useState(null);
    const [selectedDept, setSelectedDept] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [docsRes, deptsRes] = await Promise.all([
                api.get('/doctors'),
                api.get('/departments')
            ]);

            setDoctors(docsRes.data.doctors || []);
            setDepartments(deptsRes.data.departments || []);

            if (deptsRes.data?.departments?.length > 0) {
                setSelectedDept(deptsRes.data.departments[0].id);
            }

            try {
                const profileRes = await api.get('/patients/profile/me');
                if (profileRes.data && profileRes.data.patient) {
                    setPatientData(profileRes.data.patient);
                } else {
                    console.warn('No patient profile returned from API');
                    toast.info('Welcome! Book an appointment and your profile will be linked once your account is found.');
                }
            } catch (err) {
                const status = err.response?.status;
                if (status === 401 || status === 403 || status === 404) {
                    console.info('Patient profile not available for current session:', status);
                    toast.info('Not logged in as patient. You can still book an appointment.');
                } else {
                    console.warn('Could not fetch patient profile for booking:', err.message || err);
                    toast.warn('Unable to load patient profile currently; you can still book an appointment.');
                }
            }
        } catch (err) {
            console.error('Error loading portal data:', err);
            toast.error('Failed to load doctor/department data. Please refresh.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.doctor_id) return toast.warning('Please select a doctor');
        if (!formData.appointment_date) return toast.warning('Please select a date and time');

        try {
            await api.post('/appointments', formData);
            toast.success('Appointment requested successfully!');
            setFormData({ doctor_id: '', appointment_date: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Booking failed');
        }
    };

    const filteredDoctors = doctors.filter(doc => {
        const matchesDept = selectedDept ? doc.department_id === selectedDept : true;
        const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.specialization.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDept && matchesSearch;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Schedule Consultation</h1>
                    <p className="text-slate-500 mt-1">Select a specialist and choose your preferred time</p>
                </div>
                {patientData && (
                    <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                            {patientData.name[0]}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-800 tracking-wide uppercase">Patient ID</p>
                            <p className="text-sm font-bold text-blue-600">#P-{patientData.id}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Sidebar: Departments */}
                <div className="lg:col-span-3 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Clinical Departments</h3>
                    <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 no-scrollbar">
                        {departments.map(dept => (
                            <button
                                key={dept.id}
                                onClick={() => setSelectedDept(dept.id)}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all whitespace-nowrap lg:whitespace-normal text-left ${selectedDept === dept.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'
                                        : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Building2 size={16} />
                                    {dept.name}
                                </span>
                                <ChevronRight size={14} className={selectedDept === dept.id ? 'opacity-100' : 'opacity-0'} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content: Doctor Selection & Booking */}
                <div className="lg:col-span-9 space-y-6">
                    <div className="card border-none shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center p-4">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                className="input-field pl-10 h-11"
                                placeholder="Search by name or specialty..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Showing {filteredDoctors.length} Specialists
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredDoctors.map(doc => (
                            <div
                                key={doc.id}
                                onClick={() => setFormData({ ...formData, doctor_id: doc.id })}
                                className={`card group cursor-pointer transition-all border-2 relative overflow-hidden ${formData.doctor_id === doc.id
                                        ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-600/5'
                                        : 'border-slate-100 hover:border-blue-300'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-50 text-blue-700 font-bold text-xl ring-4 ring-slate-50">
                                        {doc.name[0]}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-800 text-lg">Dr. {doc.name}</h4>
                                            {doc.availability_status && <ShieldCheck size={16} className="text-emerald-500" />}
                                        </div>
                                        <p className="text-sm text-blue-600 font-bold mb-1">{doc.specialization}</p>
                                        <p className="text-xs text-slate-500 font-medium">{doc.experience} Years Experience</p>
                                    </div>
                                    {formData.doctor_id === doc.id && (
                                        <div className="absolute top-4 right-4 text-blue-700">
                                            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center">
                                                <Check size={14} strokeWidth={4} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredDoctors.length === 0 && (
                        <div className="card py-16 text-center text-slate-400 italic">
                            No specialists found matching your search.
                        </div>
                    )}

                    {formData.doctor_id && (
                        <div className="card bg-slate-900 border-none text-white p-8 space-y-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Clock className="text-blue-500" /> Finalize Appointment
                            </h3>
                            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2 px-1">Choose Date & Time</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
                                        <input
                                            type="datetime-local"
                                            className="w-full h-14 bg-slate-800 border-none rounded-2xl pl-12 pr-4 text-lg font-bold focus:ring-2 focus:ring-blue-500 text-white"
                                            required
                                            value={formData.appointment_date}
                                            onChange={e => setFormData({ ...formData, appointment_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 rounded-2xl transition-all flex items-center gap-2 group whitespace-nowrap">
                                    Request Consultation <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookAppointment;
