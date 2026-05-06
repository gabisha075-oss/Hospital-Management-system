import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Hospital, Search, CheckCircle, UserX } from 'lucide-react';

const PatientAdmission = () => {
    const [patients, setPatients] = useState([]);
    const [inpatients, setInpatients] = useState([]);
    const [inpatientStats, setInpatientStats] = useState({});
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showAdmitModal, setShowAdmitModal] = useState(false);
    const [showDischargeModal, setShowDischargeModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching admission data...');
            
            // Create abort controller with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const [patientsRes, inpatientsRes, statsRes] = await Promise.all([
                api.get('/patients', { signal: controller.signal }),
                api.get('/patients/inpatients/all', { signal: controller.signal }),
                api.get('/patients/inpatients/stats', { signal: controller.signal })
            ]);
            
            clearTimeout(timeoutId);
            
            console.log('Data fetched:', { patientsRes, inpatientsRes, statsRes });
            
            setPatients(patientsRes.data?.patients || []);
            setInpatients(inpatientsRes.data?.patients || inpatientsRes.data?.inpatients || []);
            setInpatientStats(statsRes.data?.stats || {});
        } catch (error) {
            console.error('Error fetching data:', error);
            if (error.name === 'AbortError') {
                setError('Request timeout. Please check your internet connection and try again.');
            } else {
                setError(`Failed to load data: ${error.message || 'Unknown error'}. Please try refreshing the page.`);
            }
            toast.error('Failed to fetch admission data');
        } finally {
            setLoading(false);
        }
    };

    const handleAdmitPatient = async (patientId) => {
        setLoading(true);
        try {
            await api.post('/patients/admit', { patient_id: patientId });
            toast.success('Patient admitted successfully');
            setShowAdmitModal(false);
            setSelectedPatient(null);
            fetchAllData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to admit patient');
        }
        setLoading(false);
    };

    const handleDischargePatient = async (patientId) => {
        setLoading(true);
        try {
            await api.post('/patients/discharge', { patient_id: patientId });
            toast.success('Patient discharged successfully');
            setShowDischargeModal(false);
            setSelectedPatient(null);
            fetchAllData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to discharge patient');
        }
        setLoading(false);
    };

    const filteredPatients = patients.filter(patient =>
        (patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.id?.toString().includes(searchTerm)) && 
        patient.patient_type === 'outpatient'
    );

    const filteredInpatients = inpatients.filter(patient =>
        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.id?.toString().includes(searchTerm)
    );

    if (loading && patients.length === 0 && inpatients.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin mb-4 flex justify-center">
                        <Hospital size={48} className="text-blue-600" />
                    </div>
                    <p className="text-slate-600 font-semibold">Loading admission data...</p>
                    <p className="text-slate-400 text-sm mt-2">This may take a few moments</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-red-900">
                    <h3 className="font-bold text-lg mb-2">⚠️ Error Loading Admission Data</h3>
                    <p className="mb-4">{error}</p>
                    <button
                        onClick={() => fetchAllData()}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in">
            <header className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 bg-blue-50 rounded-2xl">
                        <Hospital size={36} className="text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900">Patient Admission & Discharge</h1>
                        <p className="text-slate-500 mt-1 text-lg">Manage inpatient admissions and discharges</p>
                    </div>
                </div>
            </header>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                    <p className="text-slate-500 text-sm font-semibold mb-2">Total Inpatients</p>
                    <p className="text-4xl font-black text-blue-600">{inpatientStats.total_inpatients || 0}</p>
                </div>
                <div className="card bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                    <p className="text-slate-500 text-sm font-semibold mb-2">Admitted Today</p>
                    <p className="text-4xl font-black text-green-600">{inpatientStats.admitted_today || 0}</p>
                </div>
                <div className="card bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                    <p className="text-slate-500 text-sm font-semibold mb-2">Discharged Today</p>
                    <p className="text-4xl font-black text-orange-600">{inpatientStats.discharged_today || 0}</p>
                </div>
                <div className="card bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                    <p className="text-slate-500 text-sm font-semibold mb-2">Avg Stay</p>
                    <p className="text-4xl font-black text-purple-600">
                        {Number(inpatientStats?.avg_stay_days || 0).toFixed(1)} days
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Search patients by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-12 h-12 w-full"
                />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Outpatients - Ready for Admission */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle className="text-blue-600" size={28} />
                        Outpatients (Eligible for Admission)
                    </h2>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {filteredPatients.length > 0 ? (
                            filteredPatients.map(patient => (
                                <div key={patient.id} className="card-hover group bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">{patient.name}</h3>
                                            <p className="text-slate-500 text-sm">ID: PAT-{patient.id}</p>
                                        </div>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Outpatient</span>
                                    </div>
                                    <div className="text-sm text-slate-600 space-y-1 mb-4">
                                        <p>Age: {patient.age || 'N/A'} | Gender: {patient.gender || 'N/A'}</p>
                                        <p>Blood: {patient.blood_group || 'N/A'} | Phone: {patient.phone || 'N/A'}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedPatient(patient);
                                            setShowAdmitModal(true);
                                        }}
                                        className="btn-primary w-full"
                                    >
                                        Admit as Inpatient
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200/60">
                                <CheckCircle size={40} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-600 font-semibold">No outpatients available</p>
                                <p className="text-slate-500 text-sm">All patients are currently admitted</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Current Inpatients */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Hospital className="text-green-600" size={28} />
                        Current Inpatients
                    </h2>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        {filteredInpatients.length > 0 ? (
                            filteredInpatients.map(patient => (
                                <div key={patient.id} className="card-hover group bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">{patient.name}</h3>
                                            <p className="text-slate-500 text-sm">ID: PAT-{patient.id}</p>
                                        </div>
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Inpatient</span>
                                    </div>
                                    <div className="text-sm text-slate-600 space-y-2 mb-4">
                                        <p>Age: {patient.age || 'N/A'} | Gender: {patient.gender || 'N/A'}</p>
                                        {patient.bed_number && (
                                            <p className="font-semibold text-blue-700">Bed: {patient.bed_number} | Ward: {patient.ward_name || 'N/A'}</p>
                                        )}
                                        <p>Admitted: {patient.admitted_date ? new Date(patient.admitted_date).toLocaleDateString() : 'N/A'}</p>
                                        {patient.days_admitted !== null && (
                                            <p className="font-semibold">Stay: {patient.days_admitted} days</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedPatient(patient);
                                            setShowDischargeModal(true);
                                        }}
                                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold w-full transition-all"
                                    >
                                        <UserX className="inline mr-2" size={18} />
                                        Discharge Patient
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200/60">
                                <Hospital size={40} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-600 font-semibold">No inpatients at the moment</p>
                                <p className="text-slate-500 text-sm">Admitted patients will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Admit Modal */}
            {showAdmitModal && selectedPatient && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Admit Patient</h2>
                        <div className="bg-blue-50 p-6 rounded-2xl mb-6 border border-blue-200">
                            <h3 className="text-lg font-bold text-slate-900">{selectedPatient.name}</h3>
                            <p className="text-slate-600 text-sm mt-2">ID: PAT-{selectedPatient.id}</p>
                            <p className="text-slate-600 text-sm">Age: {selectedPatient.age}, {selectedPatient.gender}</p>
                        </div>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            Are you sure you want to convert this patient to an inpatient? This will assign them to a bed and update their billing status.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setShowAdmitModal(false);
                                    setSelectedPatient(null);
                                }}
                                className="flex-1 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAdmitPatient(selectedPatient.id)}
                                disabled={loading}
                                className="flex-1 btn-primary disabled:opacity-50"
                            >
                                {loading ? 'Admitting...' : 'Confirm Admission'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Discharge Modal */}
            {showDischargeModal && selectedPatient && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Discharge Patient</h2>
                        <div className="bg-red-50 p-6 rounded-2xl mb-6 border border-red-200">
                            <h3 className="text-lg font-bold text-slate-900">{selectedPatient.name}</h3>
                            <p className="text-slate-600 text-sm mt-2">ID: PAT-{selectedPatient.id}</p>
                            <p className="text-slate-600 text-sm">Admitted: {selectedPatient.admitted_date ? new Date(selectedPatient.admitted_date).toLocaleDateString() : 'N/A'}</p>
                            {selectedPatient.days_admitted !== null && (
                                <p className="text-slate-600 text-sm">Stay: {selectedPatient.days_admitted} days</p>
                            )}
                        </div>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            Confirm discharge? This will release the bed and convert the patient back to outpatient status.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setShowDischargeModal(false);
                                    setSelectedPatient(null);
                                }}
                                className="flex-1 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDischargePatient(selectedPatient.id)}
                                disabled={loading}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 transition-all"
                            >
                                {loading ? 'Discharging...' : 'Confirm Discharge'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientAdmission;
