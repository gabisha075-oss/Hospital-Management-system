import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const LivePatientFlow = () => {
    const [liveFlow, setLiveFlow] = useState([]);
    const [todayStats, setTodayStats] = useState({});
    const [queueStats, setQueueStats] = useState({});
    const [appointments, setAppointments] = useState([]);
    const [pendingLabTests, setPendingLabTests] = useState([]);
    const [bedSummary, setBedSummary] = useState({});
    const [recentDischarges, setRecentDischarges] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchLiveFlow();
        fetchReceptionistDashboard();

        // SSE-based real-time updates
        const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const token = localStorage.getItem('token');
        const streamUrl = `${apiBaseUrl}/api/dashboard/live-flow/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

        let eventSource;
        try {
            eventSource = new EventSource(streamUrl);
            eventSource.addEventListener('liveFlow', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLiveFlow(data.live_flow || []);
                    setTodayStats(data.today_stats || {});
                    setQueueStats(data.queue_stats || {});
                } catch (err) {
                    console.error('Invalid SSE payload', err);
                }
            });

            eventSource.addEventListener('error', (err) => {
                console.error('SSE live flow error, falling back to polling', err);
            });
        } catch (err) {
            console.warn('EventSource not supported, using polling', err);
        }

        // Polling fallback every 30 seconds
        const interval = setInterval(() => {
            fetchLiveFlow();
            fetchReceptionistDashboard();
        }, 30000);

        return () => {
            if (eventSource) {
                eventSource.close();
            }
            clearInterval(interval);
        };
    }, []);

    const fetchLiveFlow = async () => {
        try {
            const response = await api.get('/dashboard/live-flow');
            setLiveFlow(response.data.live_flow);
            setTodayStats(response.data.today_stats);
            setQueueStats(response.data.queue_stats);
        } catch (error) {
            console.error('Failed to fetch live flow:', error);
        }
    };

    const fetchReceptionistDashboard = async () => {
        try {
            const response = await api.get('/dashboard/receptionist');
            setAppointments(response.data.dashboard.today_appointments);
            setPendingLabTests(response.data.dashboard.pending_lab_tests);
            setBedSummary(response.data.dashboard.bed_summary);
            setRecentDischarges(response.data.dashboard.recent_discharges);
        } catch (error) {
            console.error('Failed to fetch receptionist dashboard:', error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'waiting': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'emergency': return 'bg-red-100 text-red-800 border-red-300';
            case 'in_consultation': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'lab_test': return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'pharmacy': return 'bg-teal-100 text-teal-800 border-teal-300';
            case 'admitted': return 'bg-green-100 text-green-800 border-green-300';
            case 'discharged': return 'bg-gray-100 text-gray-800 border-gray-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'waiting': return '⏳';
            case 'emergency': return '🚨';
            case 'in_consultation': return '👨‍⚕️';
            case 'lab_test': return '🧪';
            case 'pharmacy': return '💊';
            case 'admitted': return '🏥';
            case 'discharged': return '✅';
            default: return '📋';
        }
    };

    const formatTime = (minutes) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Live Patient Flow Dashboard</h1>
                <p className="text-gray-600">Real-time patient tracking and hospital operations overview</p>
            </div>

            {/* Today's Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg border">
                    <h3 className="text-sm font-semibold text-blue-900">Total Today</h3>
                    <p className="text-2xl font-bold text-blue-600">{todayStats.total_today || 0}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border">
                    <h3 className="text-sm font-semibold text-yellow-900">Waiting</h3>
                    <p className="text-2xl font-bold text-yellow-600">{todayStats.waiting || 0}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border">
                    <h3 className="text-sm font-semibold text-blue-900">In Consultation</h3>
                    <p className="text-2xl font-bold text-blue-600">{todayStats.in_consultation || 0}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border">
                    <h3 className="text-sm font-semibold text-purple-900">In Lab</h3>
                    <p className="text-2xl font-bold text-purple-600">{todayStats.in_lab || 0}</p>
                </div>
                <div className="bg-teal-50 p-4 rounded-lg border">
                    <h3 className="text-sm font-semibold text-teal-900">Pharmacy</h3>
                    <p className="text-2xl font-bold text-teal-600">{todayStats.pharmacy || 0}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border">
                    <h3 className="text-sm font-semibold text-green-900">Admitted</h3>
                    <p className="text-2xl font-bold text-green-600">{todayStats.admitted || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <h3 className="text-sm font-semibold text-gray-900">Completed</h3>
                    <p className="text-2xl font-bold text-gray-600">{todayStats.completed_today || 0}</p>
                </div>
            </div>

            {/* Queue Statistics */}
            <div className="bg-orange-50 p-4 rounded-lg border mb-8">
                <h2 className="text-xl font-semibold text-orange-900 mb-2">Queue Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-orange-700">Total in Queue</p>
                        <p className="text-2xl font-bold text-orange-600">{queueStats.total_queue || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm text-orange-700">Average Wait Time</p>
                        <p className="text-2xl font-bold text-orange-600">
                            {queueStats.avg_wait_time ? formatTime(Math.round(queueStats.avg_wait_time)) : '0m'}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-orange-700">Max Wait Time</p>
                        <p className="text-2xl font-bold text-orange-600">
                            {queueStats.max_wait_time ? formatTime(queueStats.max_wait_time) : '0m'}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-orange-700">Min Wait Time</p>
                        <p className="text-2xl font-bold text-orange-600">
                            {queueStats.min_wait_time ? formatTime(queueStats.min_wait_time) : '0m'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Live Patient Flow */}
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-semibold mb-4">Live Patient Flow</h2>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {liveFlow.map(patient => (
                            <div
                                key={patient.id}
                                className={`p-4 border-2 rounded-lg ${getStatusColor(patient.status)}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">{getStatusIcon(patient.status)}</span>
                                        <div>
                                            <h3 className="font-semibold text-lg">{patient.patient_name}</h3>
                                            <p className="text-sm opacity-75">
                                                {patient.patient_type} • Age: {patient.age} • {patient.gender}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="px-2 py-1 rounded text-xs font-medium uppercase">
                                            {patient.status.replace('_', ' ')}
                                        </span>
                                        {patient.wait_time_minutes && (
                                            <p className="text-sm mt-1 opacity-75">
                                                Wait: {formatTime(patient.wait_time_minutes)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {patient.doctor_name && (
                                    <p className="text-sm opacity-75">Doctor: {patient.doctor_name}</p>
                                )}
                                <p className="text-sm opacity-75 mt-1">
                                    Check-in: {new Date(patient.check_in_time).toLocaleString()}
                                </p>
                            </div>
                        ))}
                        {liveFlow.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                No active patients at the moment
                            </div>
                        )}
                    </div>
                </div>

                {/* Side Panel */}
                <div className="space-y-6">
                    {/* Today's Appointments */}
                    <div className="bg-white p-4 rounded-lg border shadow">
                        <h3 className="text-lg font-semibold mb-3">Today's Appointments</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {appointments.map(appointment => (
                                <div key={appointment.id} className="p-2 bg-gray-50 rounded">
                                    <p className="font-medium text-sm">{appointment.patient_name}</p>
                                    <p className="text-xs text-gray-600">{appointment.time_formatted}</p>
                                    <p className="text-xs text-gray-500">{appointment.specialization}</p>
                                </div>
                            ))}
                            {appointments.length === 0 && (
                                <p className="text-sm text-gray-500">No appointments today</p>
                            )}
                        </div>
                    </div>

                    {/* Bed Availability */}
                    <div className="bg-white p-4 rounded-lg border shadow">
                        <h3 className="text-lg font-semibold mb-3">Bed Availability</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm">Total Beds:</span>
                                <span className="font-semibold">{bedSummary.total_beds || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-green-600">Available:</span>
                                <span className="font-semibold text-green-600">{bedSummary.available_beds || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-red-600">Occupied:</span>
                                <span className="font-semibold text-red-600">{bedSummary.occupied_beds || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pending Lab Tests */}
                    <div className="bg-white p-4 rounded-lg border shadow">
                        <h3 className="text-lg font-semibold mb-3">Pending Lab Tests</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {pendingLabTests.map(test => (
                                <div key={test.id} className="p-2 bg-gray-50 rounded">
                                    <p className="font-medium text-sm">{test.patient_name}</p>
                                    <p className="text-xs text-gray-600">{test.test_name}</p>
                                    <span className={`px-1 py-0.5 rounded text-xs ${
                                        test.priority === 'emergency' ? 'bg-red-100 text-red-800' :
                                        test.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                                        'bg-blue-100 text-blue-800'
                                    }`}>
                                        {test.priority}
                                    </span>
                                </div>
                            ))}
                            {pendingLabTests.length === 0 && (
                                <p className="text-sm text-gray-500">No pending tests</p>
                            )}
                        </div>
                    </div>

                    {/* Recent Discharges */}
                    <div className="bg-white p-4 rounded-lg border shadow">
                        <h3 className="text-lg font-semibold mb-3">Recent Discharges (24h)</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {recentDischarges.map(discharge => (
                                <div key={discharge.id} className="p-2 bg-gray-50 rounded">
                                    <p className="font-medium text-sm">{discharge.patient_name}</p>
                                    <p className="text-xs text-gray-600">
                                        Stay: {discharge.stay_hours} hours
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(discharge.discharged_date).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                            {recentDischarges.length === 0 && (
                                <p className="text-sm text-gray-500">No recent discharges</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Auto-refresh indicator */}
            <div className="mt-8 text-center text-sm text-gray-500">
                🔄 Dashboard auto-refreshes every 30 seconds • Last updated: {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
};

export default LivePatientFlow;
