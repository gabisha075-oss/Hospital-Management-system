import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Activity, CheckCircle, Clock, AlertCircle, LogOut, Beaker } from 'lucide-react';

const PatientFlowTracking = () => {
    const [flows, setFlows] = useState([]);
    const [flowStats, setFlowStats] = useState({});
    const [patients, setPatients] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [checkInForm, setCheckInForm] = useState({
        patient_id: '',
        department_id: ''
    });

    useEffect(() => {
        fetchPatients();
        fetchDepartments();

        const stream = new EventSource('/api/dashboard/live-flow/stream');

        stream.addEventListener('liveFlow', (event) => {
            try {
                const payload = JSON.parse(event.data);
                setFlows(payload.live_flow || []);
                setFlowStats(payload.today_stats || {});
            } catch (err) {
                console.error('Failed to parse SSE payload from live flow', err);
            } finally {
                setLoading(false);
            }
        });

        stream.addEventListener('error', (e) => {
            console.error('SSE live-flow error', e);
            if (stream.readyState === EventSource.CLOSED) {
                stream.close();
            }

            // fallback to polling
            fetchFlows();
            const poll = setInterval(fetchFlows, 30000);
            return () => clearInterval(poll);
        });

        stream.onerror = () => {
            console.warn('SSE failed, switching to polling fallback');
            stream.close();
            fetchFlows();
        };

        return () => {
            stream.close();
        };
    }, []);

    const fetchFlows = async () => {
        try {
            const res = await api.get('/patient-flow');
            setFlows(res.data.activePatients || res.data.patients || res.data.flows || []);

            if (res.data.today_stats) {
                setFlowStats(res.data.today_stats);
            }
        } catch (err) {
            console.error('Failed to fetch flow tracking');
        } finally {
            setLoading(false);
        }
    };

    const fetchPatients = async () => {
        try {
            const res = await api.get('/patients');
            setPatients(res.data.patients);
        } catch (err) {
            console.error('Failed to fetch patients');
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments');
            setDepartments(res.data.departments || []);
        } catch (err) {
            console.error('Failed to fetch departments');
        }
    };

    const handleCheckIn = async (e) => {
        e.preventDefault();
        try {
            await api.post('/patient-flow/checkin', checkInForm);
            toast.success('Patient checked in successfully');
            setShowCheckInModal(false);
            setCheckInForm({ patient_id: '', department_id: '' });
            fetchFlows();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Check-in failed');
        }
    };

    const updateStatus = async (patientId, newStatus) => {
        try {
            await api.patch('/patient-flow/status', { patient_id: patientId, status: newStatus });
            toast.success(`Status updated to ${newStatus}`);
            fetchFlows();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'checked_in': 'bg-blue-100 text-blue-800',
            'waiting': 'bg-yellow-100 text-yellow-800',
            'emergency': 'bg-red-100 text-red-800',
            'in_consultation': 'bg-purple-100 text-purple-800',
            'lab_test': 'bg-orange-100 text-orange-800',
            'pharmacy': 'bg-teal-100 text-teal-800',
            'admitted': 'bg-indigo-100 text-indigo-800',
            'discharged': 'bg-green-100 text-green-800',
            'checked_out': 'bg-slate-100 text-slate-800'
        };
        return colors[status] || 'bg-slate-100 text-slate-800';
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'checked_in': return <CheckCircle size={16} />;
            case 'waiting': return <Clock size={16} />;
            case 'emergency': return <AlertCircle size={16} />;
            case 'lab_test': return <Beaker size={16} />;
            case 'pharmacy': return <span role="img" aria-label="pharmacy">💊</span>;
            case 'checked_out': return <LogOut size={16} />;
            default: return <Activity size={16} />;
        }
    };

    const activeFlows = flows.filter(f => f.check_out_time === null);

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-white p-8 rounded-2xl border border-slate-200/60 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Activity className="text-blue-600" size={32} />
                        Patient Flow Tracking
                    </h1>
                    <p className="text-slate-500 mt-2">Real-time monitoring of patient progression through the hospital</p>
                </div>
                <button
                    onClick={() => setShowCheckInModal(true)}
                    className="btn-primary px-8"
                >
                    Check In Patient
                </button>
            </header>

            {/* Flow Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="card p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase">Checked In</p>
                    <p className="text-2xl font-black text-blue-600">{activeFlows.filter(f => f.status === 'checked_in').length}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase">Waiting</p>
                    <p className="text-2xl font-black text-yellow-600">{activeFlows.filter(f => f.status === 'waiting').length}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase">In Consultation</p>
                    <p className="text-2xl font-black text-purple-600">{activeFlows.filter(f => f.status === 'in_consultation').length}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase">Lab Tests</p>
                    <p className="text-2xl font-black text-orange-600">{activeFlows.filter(f => f.status === 'lab_test').length}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase">Pharmacy</p>
                    <p className="text-2xl font-black text-teal-600">{activeFlows.filter(f => f.status === 'pharmacy').length}</p>
                </div>
                <div className="card p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase">Admitted</p>
                    <p className="text-2xl font-black text-indigo-600">{activeFlows.filter(f => f.status === 'admitted').length}</p>
                </div>
            </div>

            {/* Active Patient Flows */}
            <div className="card overflow-hidden">
                <div className="p-6 border-b bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-900">Active Patient Flow</h2>
                    <p className="text-sm text-slate-500 mt-1">Patients currently in the system</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-white">
                                <th className="px-6 py-3 text-left font-bold text-slate-700">Patient</th>
                                <th className="px-6 py-3 text-left font-bold text-slate-700">Current Status</th>
                                <th className="px-6 py-3 text-left font-bold text-slate-700">Department/Doctor</th>
                                <th className="px-6 py-3 text-left font-bold text-slate-700">Duration</th>
                                <th className="px-6 py-3 text-left font-bold text-slate-700">Check-in Time</th>
                                <th className="px-6 py-3 text-right font-bold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {activeFlows.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16">
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <Activity size={48} className="text-slate-300 mb-4" />
                                            <p className="text-slate-700 font-bold text-lg mb-1">No active patients at the moment</p>
                                            <p className="text-slate-500 text-sm">Patients will appear here once they check in</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                activeFlows.map(flow => (
                                    <tr key={flow.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-slate-900">{flow.patient_name}</p>
                                                <p className="text-xs text-slate-500">ID: PAT-{flow.patient_id}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold ${getStatusColor(flow.status)}`}>
                                                {getStatusIcon(flow.status)}
                                                {flow.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <p className="font-medium">{flow.doctor_name || flow.department_name || '-'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {flow.check_out_time === null ? (
                                                <span className="font-medium text-slate-900">
                                                    {Math.round((new Date() - new Date(flow.check_in_time)) / 60000)} mins
                                                </span>
                                            ) : (
                                                <span className="text-slate-500">{flow.duration_minutes} mins</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(flow.check_in_time).toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {flow.status === 'checked_in' && (
                                                <button
                                                    onClick={() => updateStatus(flow.patient_id, 'waiting')}
                                                    className="text-xs px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 font-semibold"
                                                >
                                                    → Waiting
                                                </button>
                                            )}
                                            {flow.status === 'waiting' && (
                                                <button
                                                    onClick={() => updateStatus(flow.patient_id, 'in_consultation')}
                                                    className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 font-semibold"
                                                >
                                                    → Consultation
                                                </button>
                                            )}
                                            {flow.status === 'in_consultation' && (
                                                <select
                                                    value=""
                                                    onChange={(e) => updateStatus(flow.patient_id, e.target.value)}
                                                    className="text-xs px-2 py-1 border rounded"
                                                    defaultValue=""
                                                >
                                                    <option value="">Next Step...</option>
                                                    <option value="lab_test">Lab Test</option>
                                                    <option value="pharmacy">Pharmacy</option>
                                                    <option value="admitted">Admit</option>
                                                    <option value="checked_out">Checkout</option>
                                                </select>
                                            )}
                                            {flow.status === 'lab_test' && (
                                                <button
                                                    onClick={() => updateStatus(flow.patient_id, 'checked_out')}
                                                    className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 font-semibold"
                                                >
                                                    → Checkout
                                                </button>
                                            )}
                                            {flow.status === 'pharmacy' && (
                                                <button
                                                    onClick={() => updateStatus(flow.patient_id, 'checked_out')}
                                                    className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 font-semibold"
                                                >
                                                    → Checkout
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Check-in Modal */}
            {showCheckInModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Check In Patient</h2>
                        <form onSubmit={handleCheckIn} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Patient</label>
                                <select
                                    className="input-field"
                                    required
                                    value={checkInForm.patient_id}
                                    onChange={e => setCheckInForm({...checkInForm, patient_id: e.target.value})}
                                >
                                    <option value="">-- Select Patient --</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (Age: {p.age}, {p.gender})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Department</label>
                                <select
                                    className="input-field"
                                    value={checkInForm.department_id}
                                    onChange={e => setCheckInForm({...checkInForm, department_id: e.target.value})}
                                >
                                    <option value="">-- Select Department --</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCheckInModal(false)}
                                    className="flex-1 px-4 py-2 border rounded-xl text-slate-600 font-bold hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 btn-primary"
                                >
                                    Check In
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientFlowTracking;
