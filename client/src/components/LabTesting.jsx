import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const LabTesting = () => {
    const [labTests, setLabTests] = useState([]);
    const [pendingTests, setPendingTests] = useState([]);
    const [patients, setPatients] = useState([]);
    const [labStats, setLabStats] = useState({});
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [showResultsForm, setShowResultsForm] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [userId, setUserId] = useState(null);

    // Form states
    const [requestForm, setRequestForm] = useState({
        patient_id: '',
        test_name: '',
        test_category: 'blood',
        priority: 'routine',
        notes: ''
    });

    const [resultsForm, setResultsForm] = useState({
        results: '',
        notes: '',
        reportFile: null
    });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setUserRole(user?.role || '');
        setUserId(user?.id || null);

        fetchLabTests();
        fetchPendingTests();
        fetchLabStats();
        if (user?.role === 'doctor') {
            fetchPatients();
        }
    }, []);

    const fetchLabTests = async () => {
        try {
            const response = await api.get('/lab-tests/all');
            setLabTests(response.data.tests);
        } catch (error) {
            toast.error('Failed to fetch lab tests');
        }
    };

    const fetchPendingTests = async () => {
        try {
            const response = await api.get('/lab-tests/pending');
            setPendingTests(response.data.tests);
        } catch (error) {
            toast.error('Failed to fetch pending tests');
        }
    };

    const fetchLabStats = async () => {
        try {
            const response = await api.get('/lab-tests/stats');
            setLabStats(response.data.stats);
        } catch (error) {
            toast.error('Failed to fetch lab statistics');
        }
    };

    const fetchPatients = async () => {
        try {
            const response = await api.get('/patients');
            setPatients(response.data.patients);
        } catch (error) {
            toast.error('Failed to fetch patients');
        }
    };

    const handleRequestTest = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/lab-tests/request', requestForm);
            toast.success('Lab test requested successfully');
            setShowRequestForm(false);
            setRequestForm({
                patient_id: '',
                test_name: '',
                test_category: 'blood',
                priority: 'routine',
                notes: ''
            });
            fetchPendingTests();
            fetchLabStats();
        } catch (error) {
            toast.error('Failed to request lab test');
        }
        setLoading(false);
    };

    const handleUpdateResults = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/lab-tests/${selectedTest.id}/results`, {
                results: resultsForm.results,
                notes: resultsForm.notes
            });
            
            // Upload report file if provided
            if (resultsForm.reportFile) {
                const formData = new FormData();
                formData.append('report', resultsForm.reportFile);
                formData.append('patient_id', selectedTest.patient_id);
                
                await api.post('/lab/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                toast.success('Test results and report uploaded successfully');
            } else {
                toast.success('Test results updated successfully');
            }
            
            setShowResultsForm(false);
            setSelectedTest(null);
            setResultsForm({ results: '', notes: '', reportFile: null });
            fetchLabTests();
            fetchPendingTests();
            fetchLabStats();
        } catch (error) {
            toast.error('Failed to update test results');
        }
        setLoading(false);
    };

    const handleAssignTest = async (testId, technicianId) => {
        try {
            await api.put(`/lab-tests/${testId}/assign`, { assigned_to_user_id: technicianId });
            toast.success('Test assigned successfully');
            fetchPendingTests();
        } catch (error) {
            toast.error('Failed to assign test');
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'emergency': return 'bg-red-100 text-red-800';
            case 'urgent': return 'bg-orange-100 text-orange-800';
            case 'routine': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'requested': return 'bg-yellow-100 text-yellow-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            case 'lab_done': return 'bg-emerald-100 text-emerald-800';
            case 'completed': return 'bg-emerald-100 text-emerald-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'lab_done': return 'Completed';
            case 'completed': return 'Completed';
            default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Lab Testing Management</h1>

                {/* Lab Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-blue-900">Total Tests</h3>
                        <p className="text-2xl font-bold text-blue-600">{labStats.total_tests || 0}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-yellow-900">Pending</h3>
                        <p className="text-2xl font-bold text-yellow-600">{labStats.pending || 0}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-blue-900">In Progress</h3>
                        <p className="text-2xl font-bold text-blue-600">{labStats.in_progress || 0}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-green-900">Lab Done</h3>
                        <p className="text-2xl font-bold text-green-600">{labStats.lab_done || labStats.completed || 0}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-red-900">Emergency</h3>
                        <p className="text-2xl font-bold text-red-600">{labStats.emergency_pending || 0}</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mb-6">
                {userRole === 'doctor' && (
                    <button
                        onClick={() => setShowRequestForm(true)}
                        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 mr-4"
                    >
                        Request Lab Test
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pending Tests */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Pending Lab Tests</h2>
                    <div className="space-y-4">
                        {pendingTests.map(test => (
                            <div key={test.id} className="p-4 border rounded-lg bg-white shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-semibold text-lg">{test.test_name}</h3>
                                        <p className="text-gray-600">Patient: {test.patient_name}</p>
                                        <p className="text-sm text-gray-500">Doctor: {test.doctor_name}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(test.priority)}`}>
                                            {test.priority}
                                        </span>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(test.status)}`}>
                                                {getStatusLabel(test.status)}
                                            </span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">Category: {test.test_category}</p>
                                <p className="text-sm text-gray-500 mb-3">
                                    Requested: {new Date(test.requested_date).toLocaleString()}
                                </p>
                                <>
                                    {(userRole === 'lab' || userRole === 'admin') && (['requested', 'in_progress'].includes(test.status)) && (
                                        <div className="flex flex-wrap gap-2">
                                            {test.status === 'requested' && (
                                                <button
                                                    onClick={() => handleAssignTest(test.id, userId)}
                                                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                                                >
                                                    Assign to Me
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedTest(test);
                                                    setShowResultsForm(true);
                                                }}
                                                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                                            >
                                                Update Results
                                            </button>
                                            {test.status === 'in_progress' ? (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await api.put(`/lab-tests/${test.id}/complete`);
                                                            toast.success('Lab test marked completed and patient flow updated.');
                                                            fetchPendingTests();
                                                            fetchLabStats();
                                                        } catch (err) {
                                                            toast.error(err.response?.data?.message || 'Failed to complete test');
                                                        }
                                                    }}
                                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                                >
                                                    Mark Completed
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                    {test.status === 'lab_done' && (userRole === 'lab' || userRole === 'admin') && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-700 font-semibold text-sm">✓ Ready for doctor review</span>
                                            <button
                                                onClick={() => {
                                                    setSelectedTest(test);
                                                    setShowResultsForm(true);
                                                }}
                                                className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                                            >
                                                View Results
                                            </button>
                                        </div>
                                    )}
                                </>
                            </div>
                        ))}
                        {pendingTests.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                No pending lab tests
                            </div>
                        )}
                    </div>
                </div>

                {/* All Tests */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">All Lab Tests</h2>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {labTests.slice(0, 10).map(test => (
                            <div key={test.id} className="p-4 border rounded-lg bg-white shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-semibold">{test.test_name}</h3>
                                        <p className="text-gray-600 text-sm">Patient: {test.patient_name}</p>
                                        <p className="text-sm text-gray-500">Doctor: {test.doctor_name}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(test.status)}`}>
                                        {getStatusLabel(test.status)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">Category: {test.test_category}</p>
                                <p className="text-sm text-gray-500">
                                    {new Date(test.requested_date).toLocaleDateString()}
                                </p>
                                {test.results && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded">
                                        <p className="text-sm font-medium">Results:</p>
                                        <p className="text-sm text-gray-700">{test.results}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Request Lab Test Modal */}
            {showRequestForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-96 max-h-96 overflow-y-auto">
                        <h3 className="text-xl font-semibold mb-4">Request Lab Test</h3>
                        <form onSubmit={handleRequestTest}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Patient</label>
                                <select
                                    value={requestForm.patient_id}
                                    onChange={(e) => setRequestForm({...requestForm, patient_id: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    required
                                >
                                    <option value="">Select Patient</option>
                                    {patients.map(patient => (
                                        <option key={patient.id} value={patient.id}>
                                            {patient.name} (ID: {patient.id})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Test Name</label>
                                <input
                                    type="text"
                                    value={requestForm.test_name}
                                    onChange={(e) => setRequestForm({...requestForm, test_name: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    required
                                    placeholder="e.g., Complete Blood Count"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Test Category</label>
                                <select
                                    value={requestForm.test_category}
                                    onChange={(e) => setRequestForm({...requestForm, test_category: e.target.value})}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="blood">Blood Test</option>
                                    <option value="urine">Urine Test</option>
                                    <option value="xray">X-Ray</option>
                                    <option value="mri">MRI</option>
                                    <option value="ct_scan">CT Scan</option>
                                    <option value="ecg">ECG</option>
                                    <option value="ultrasound">Ultrasound</option>
                                    <option value="biopsy">Biopsy</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Priority</label>
                                <select
                                    value={requestForm.priority}
                                    onChange={(e) => setRequestForm({...requestForm, priority: e.target.value})}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="routine">Routine</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="emergency">Emergency</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Notes</label>
                                <textarea
                                    value={requestForm.notes}
                                    onChange={(e) => setRequestForm({...requestForm, notes: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    rows="3"
                                    placeholder="Additional instructions or notes"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowRequestForm(false)}
                                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {loading ? 'Requesting...' : 'Request Test'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Update Results Modal */}
            {showResultsForm && selectedTest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-96">
                        <h3 className="text-xl font-semibold mb-4">Update Test Results</h3>
                        <div className="mb-4 p-3 bg-gray-50 rounded">
                            <p className="font-medium">{selectedTest.test_name}</p>
                            <p className="text-sm text-gray-600">Patient: {selectedTest.patient_name}</p>
                        </div>
                        <form onSubmit={handleUpdateResults}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Test Results</label>
                                <textarea
                                    value={resultsForm.results}
                                    onChange={(e) => setResultsForm({...resultsForm, results: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    rows="4"
                                    required
                                    placeholder="Enter test results..."
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Additional Notes</label>
                                <textarea
                                    value={resultsForm.notes}
                                    onChange={(e) => setResultsForm({...resultsForm, notes: e.target.value})}
                                    className="w-full p-2 border rounded"
                                    rows="2"
                                    placeholder="Additional notes or observations"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Upload Report PDF (Optional)</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setResultsForm({...resultsForm, reportFile: e.target.files[0]})}
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowResultsForm(false);
                                        setSelectedTest(null);
                                        setResultsForm({ results: '', notes: '', reportFile: null });
                                    }}
                                    className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                >
                                    {loading ? 'Updating...' : 'Update Results'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LabTesting;
