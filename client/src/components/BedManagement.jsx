import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Trash2, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const BedManagement = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [wards, setWards] = useState([]);
    const [beds, setBeds] = useState([]);
    const [availableBeds, setAvailableBeds] = useState([]);
    const [bedStats, setBedStats] = useState({});
    const [patients, setPatients] = useState([]);
    const [selectedWard, setSelectedWard] = useState(null);
    const [selectedBed, setSelectedBed] = useState(null);
    const [showAddWard, setShowAddWard] = useState(false);
    const [showAddBed, setShowAddBed] = useState(false);
    const [showReserveModal, setShowReserveModal] = useState(false);
    const [showDischargeModal, setShowDischargeModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [admissionContext, setAdmissionContext] = useState(null);

    // Form states
    const [wardForm, setWardForm] = useState({
        name: '',
        description: '',
        total_beds: ''
    });

    const [bedForm, setBedForm] = useState({
        bed_number: '',
        room_number: '',
        bed_type: 'general',
        price_per_day: ''
    });

    const [reserveForm, setReserveForm] = useState({
        patient_id: '',
        notes: ''
    });

    const [dischargeForm, setDischargeForm] = useState({
        notes: ''
    });

    useEffect(() => {
        fetchWards();
        fetchAvailableBeds();
        fetchBedStats();
        fetchPatients();
    }, []);

    useEffect(() => {
        if (location.state?.admissionRequest) {
            setAdmissionContext(location.state.admissionRequest);
        }
    }, [location.state]);

    const fetchWards = async () => {
        try {
            const response = await api.get('/beds/wards');
            setWards(response.data.wards);
        } catch (error) {
            toast.error('Failed to fetch wards');
        }
    };

    const fetchBedsByWard = async (wardId) => {
        try {
            const response = await api.get(`/beds/wards/${wardId}/beds`);
            setBeds(response.data.beds);
            setSelectedWard(wardId);
        } catch (error) {
            toast.error('Failed to fetch beds');
        }
    };

    const fetchAvailableBeds = async () => {
        try {
            const response = await api.get('/beds/available');
            setAvailableBeds(response.data.beds);
        } catch (error) {
            toast.error('Failed to fetch available beds');
        }
    };

    const fetchBedStats = async () => {
        try {
            const response = await api.get('/beds/stats');
            setBedStats(response.data.overall_stats);
        } catch (error) {
            toast.error('Failed to fetch bed statistics');
        }
    };

    const fetchPatients = async () => {
        try {
            const response = await api.get('/patients');
            setPatients(response.data.patients);
        } catch (error) {
            console.error('Failed to fetch patients');
        }
    };

    const handleAddWard = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/beds/wards', wardForm);
            toast.success('Ward created successfully');
            setShowAddWard(false);
            setWardForm({ name: '', description: '', total_beds: '' });
            fetchWards();
            fetchBedStats();
        } catch (error) {
            toast.error('Failed to create ward');
        }
        setLoading(false);
    };

    const handleAddBed = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/beds/wards/${selectedWard}/beds`, bedForm);
            toast.success('Bed added successfully');
            setShowAddBed(false);
            setBedForm({ bed_number: '', room_number: '', bed_type: 'general', price_per_day: '' });
            fetchBedsByWard(selectedWard);
            fetchAvailableBeds();
            fetchBedStats();
        } catch (error) {
            toast.error('Failed to add bed');
        }
        setLoading(false);
    };

    const handleReserveBed = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/beds/reserve', {
                bed_id: selectedBed.id,
                patient_id: reserveForm.patient_id,
                notes: reserveForm.notes
            });
            toast.success('Bed reserved successfully');
            setShowReserveModal(false);
            setReserveForm({ patient_id: '', notes: '' });
            fetchBedsByWard(selectedWard);
            fetchAvailableBeds();
            fetchBedStats();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reserve bed');
        }
        setLoading(false);
    };

    const handleDischargeBed = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Need to get patient_id from the bed's current assignment
            await api.put(`/beds/${selectedBed.id}/discharge`, {
                notes: dischargeForm.notes
            });
            toast.success('Patient discharged successfully');
            setShowDischargeModal(false);
            setDischargeForm({ notes: '' });
            fetchBedsByWard(selectedWard);
            fetchAvailableBeds();
            fetchBedStats();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to discharge patient');
        }
        setLoading(false);
    };

    const handleAllocateForAdmission = async (bed) => {
        if (!admissionContext?.id) {
            toast.error('Admission request context missing');
            return;
        }
        setLoading(true);
        try {
            await api.patch(`/patients/admission-requests/${admissionContext.id}/process`, {
                bed_id: Number(bed.id),
                stay_days: Number(admissionContext.stay_days || 1),
                notes: admissionContext.notes || 'Processed from Bed Management'
            });

            toast.success(`Bed ${bed.bed_number} allocated and inpatient conversion completed`);
            setAdmissionContext(null);
            fetchWards();
            fetchBedsByWard(selectedWard || bed.ward_id);
            fetchAvailableBeds();
            fetchBedStats();
            navigate('/receptionist', { state: { openAdmissionRequests: true, ts: Date.now() } });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to allocate bed for admission');
        }
        setLoading(false);
    };

    const handleDeleteWard = async (wardId, wardName) => {
        if (!confirm(`Are you sure you want to delete "${wardName}"?\n\nThis will permanently delete the ward and all its beds.`)) {
            return;
        }

        try {
            await api.delete(`/beds/wards/${wardId}`);
            toast.success(`Ward "${wardName}" deleted successfully`);
            fetchWards();
            fetchBedStats();
            fetchAvailableBeds();
            if (selectedWard === wardId) {
                setSelectedWard(null);
                setBeds([]);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete ward');
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Bed Management</h1>
                {admissionContext && (
                    <div className="mb-4 p-4 rounded-lg border border-blue-200 bg-blue-50">
                        <p className="text-sm font-semibold text-blue-900">
                            Admission Request: {admissionContext.patient_name}
                        </p>
                        <p className="text-xs text-blue-800 mt-1">
                            Planned Stay: {admissionContext.stay_days} day(s)
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                            Select any available bed below to auto-allocate and complete inpatient conversion.
                        </p>
                    </div>
                )}

                {/* Bed Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-blue-900">Total Beds</h3>
                        <p className="text-2xl font-bold text-blue-600">{bedStats.total_beds || 0}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-green-900">Available</h3>
                        <p className="text-2xl font-bold text-green-600">{bedStats.available_beds || 0}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-red-900">Occupied</h3>
                        <p className="text-2xl font-bold text-red-600">{bedStats.occupied_beds || 0}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-yellow-900">Occupancy Rate</h3>
                        <p className="text-2xl font-bold text-yellow-600">{bedStats.occupancy_rate || 0}%</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Wards Section */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold">Wards</h2>
                        <button
                            onClick={() => setShowAddWard(true)}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            Add Ward
                        </button>
                    </div>

                    <div className="space-y-4">
                        {wards.map(ward => (
                            <div
                                key={ward.id}
                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                    selectedWard === ward.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                                }`}
                                onClick={() => fetchBedsByWard(ward.id)}
                            >
                                <h3 className="font-semibold text-lg">{ward.name}</h3>
                                <p className="text-gray-600">{ward.description}</p>
<div className="flex justify-between items-center mt-2">
                                    <span className="text-sm text-gray-500">
                                        Total: {ward.total_beds} | Available: {ward.available_beds}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm px-2 py-1 rounded ${
                                            ward.available_beds > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {ward.available_beds > 0 ? 'Available' : 'Full'}
                                        </span>
                                        {ward.available_beds === ward.total_beds && ward.total_beds > 0 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteWard(ward.id, ward.name);
                                                }}
                                                className="text-red-500 hover:text-red-700 p-1 -m-1 rounded hover:bg-red-100 transition-all"
                                                title={`Delete empty ward: ${ward.name}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Beds Section */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold">
                            {selectedWard ? `Beds in ${wards.find(w => w.id === selectedWard)?.name}` : 'Select a Ward'}
                        </h2>
                        {selectedWard && (
                            <button
                                onClick={() => setShowAddBed(true)}
                                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            >
                                Add Bed
                            </button>
                        )}
                    </div>

                    {selectedWard ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {beds.map(bed => (
                                <div key={bed.id} className="p-4 border rounded-lg">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-semibold">Bed {bed.bed_number}</h4>
                                            <p className="text-sm text-gray-600">Room {bed.room_number}</p>
                                            <p className="text-sm text-gray-600 capitalize">{bed.bed_type}</p>
                                            <p className="text-sm font-medium">${bed.price_per_day}/day</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            bed.current_status === 'available'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {bed.current_status}
                                        </span>
                                    </div>
                                    {bed.patient_name && (
                                        <p className="text-sm text-blue-600 mt-2">Patient: {bed.patient_name}</p>
                                    )}
                                    <div className="flex gap-2 mt-3">
                                        {bed.current_status === 'available' && (
                                            admissionContext ? (
                                                <button
                                                    onClick={() => handleAllocateForAdmission(bed)}
                                                    disabled={loading}
                                                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 font-semibold disabled:opacity-50"
                                                >
                                                    Allocate For Admission
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => { setSelectedBed(bed); setShowReserveModal(true); }}
                                                    className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-xs hover:bg-blue-600 font-semibold"
                                                >
                                                    Reserve
                                                </button>
                                            )
                                        )}
                                        {bed.current_status === 'occupied' && (
                                            <button
                                                onClick={() => { setSelectedBed(bed); setShowDischargeModal(true); }}
                                                className="flex-1 bg-orange-500 text-white px-3 py-2 rounded text-xs hover:bg-orange-600 font-semibold flex items-center justify-center gap-1"
                                            >
                                                <LogOut size={14} /> Vacate
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            Select a ward to view beds
                        </div>
                    )}
                </div>
            </div>

            {/* Available Beds Section */}
            <div className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">Available Beds</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {availableBeds.map(bed => (
                        <div key={bed.id} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                            <h4 className="font-semibold text-green-900">Bed {bed.bed_number}</h4>
                            <p className="text-sm text-green-700">{bed.ward_name} - Room {bed.room_number}</p>
                            <p className="text-sm text-green-700 capitalize">{bed.bed_type}</p>
                            <p className="text-sm font-medium text-green-900">${bed.price_per_day}/day</p>
                            {admissionContext && (
                                <button
                                    onClick={() => handleAllocateForAdmission(bed)}
                                    disabled={loading}
                                    className="mt-3 w-full bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 font-semibold disabled:opacity-50"
                                >
                                    Allocate ({admissionContext.stay_days} day(s))
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Ward Modal */}
            {showAddWard && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <h3 className="text-xl font-semibold mb-4">Add New Ward</h3>
                        <form onSubmit={handleAddWard}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Ward Name</label>
                                <input
                                    type="text"
                                    value={wardForm.name}
                                    onChange={(e) => setWardForm({...wardForm, name: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={wardForm.description}
                                    onChange={(e) => setWardForm({...wardForm, description: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    rows="3"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Total Beds</label>
                                <input
                                    type="number"
                                    value={wardForm.total_beds}
                                    onChange={(e) => setWardForm({...wardForm, total_beds: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    required
                                    min="1"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddWard(false)}
                                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {loading ? 'Creating...' : 'Create Ward'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Bed Modal */}
            {showAddBed && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <h3 className="text-xl font-semibold mb-4">Add New Bed</h3>
                        <form onSubmit={handleAddBed}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Bed Number</label>
                                <input
                                    type="text"
                                    value={bedForm.bed_number}
                                    onChange={(e) => setBedForm({...bedForm, bed_number: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Room Number</label>
                                <input
                                    type="text"
                                    value={bedForm.room_number}
                                    onChange={(e) => setBedForm({...bedForm, room_number: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Bed Type</label>
                                <select
                                    value={bedForm.bed_type}
                                    onChange={(e) => setBedForm({...bedForm, bed_type: e.target.value})}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="general">General</option>
                                    <option value="private">Private</option>
                                    <option value="icu">ICU</option>
                                    <option value="emergency">Emergency</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Price per Day ($)</label>
                                <input
                                    type="number"
                                    value={bedForm.price_per_day}
                                    onChange={(e) => setBedForm({...bedForm, price_per_day: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddBed(false)}
                                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                >
                                    {loading ? 'Adding...' : 'Add Bed'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reserve Bed Modal */}
            {showReserveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <h3 className="text-xl font-semibold mb-4">Reserve Bed</h3>
                        <form onSubmit={handleReserveBed}>
                            <div className="mb-4">
                                <p className="text-sm text-gray-600">
                                    Bed {selectedBed?.bed_number} - Room {selectedBed?.room_number}
                                </p>
                                <p className="text-sm text-gray-600">
                                    ${selectedBed?.price_per_day}/day
                                </p>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Select Patient</label>
                                <select
                                    value={reserveForm.patient_id}
                                    onChange={(e) => setReserveForm({...reserveForm, patient_id: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    required
                                >
                                    <option value="">-- Choose Patient --</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (Age: {p.age}, {p.gender})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                                <textarea
                                    value={reserveForm.notes}
                                    onChange={(e) => setReserveForm({...reserveForm, notes: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    rows="3"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowReserveModal(false)}
                                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {loading ? 'Reserving...' : 'Reserve Bed'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Discharge Patient Modal */}
            {showDischargeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <h3 className="text-xl font-semibold mb-4">Discharge Patient</h3>
                        <form onSubmit={handleDischargeBed}>
                            <div className="mb-4 p-3 bg-orange-50 border-l-4 border-orange-500">
                                <p className="text-sm text-gray-600">
                                    Bed {selectedBed?.bed_number} - Room {selectedBed?.room_number}
                                </p>
                                {selectedBed?.patient_name && (
                                    <p className="text-sm font-semibold text-orange-700 mt-1">
                                        Patient: {selectedBed.patient_name}
                                    </p>
                                )}
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Discharge Notes (Optional)</label>
                                <textarea
                                    value={dischargeForm.notes}
                                    onChange={(e) => setDischargeForm({...dischargeForm, notes: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    rows="3"
                                    placeholder="Add any final notes about the patient's discharge..."
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDischargeModal(false)}
                                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                                >
                                    {loading ? 'Discharging...' : 'Discharge Patient'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BedManagement;
