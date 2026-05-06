import { useEffect, useState } from 'react';
import api from '../services/api';
import {
    Users, UserRound, DollarSign, Calendar, TrendingUp, ShieldCheck, Clock, Receipt, UserCircle2, Activity
} from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, ArcElement
);

const StatsCard = ({ title, value, icon: Icon, color }) => (
    <div className="card flex items-center gap-6">
        <div className={`p-4 rounded-2xl ${color}`}>
            <Icon size={28} />
        </div>
        <div>
            <p className="text-slate-500 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
        </div>
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/dashboard/stats');
            setStats(res.data.stats);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    const lineData = {
        labels: stats?.monthly_revenue?.map(m => m.month).reverse() || [],
        datasets: [{
            label: 'Revenue ($)',
            data: stats?.monthly_revenue?.map(m => m.total).reverse() || [],
            borderColor: '#1e40af',
            backgroundColor: 'rgba(30, 64, 175, 0.1)',
            fill: true,
            tension: 0.4
        }]
    };

    const pieData = {
        labels: stats?.appointment_stats?.map(s => s.status) || [],
        datasets: [{
            data: stats?.appointment_stats?.map(s => s.count) || [],
            backgroundColor: ['#60a5fa', '#10b981', '#f59e0b', '#ef4444'],
            borderWidth: 0
        }]
    };

    return (
        <div className="space-y-10 animate-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/10">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40">
                        <ShieldCheck size={40} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin Terminal</h1>
                        <p className="text-slate-500 mt-1 font-semibold flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            System wide overview & control
                        </p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button className="btn-secondary px-8 font-bold">Audit Logs</button>
                    <button className="btn-primary px-8">System Settings</button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="card-hover bg-white p-8 rounded-[2rem] border border-slate-200 overflow-hidden relative group">
                    <Users className="absolute -right-4 -top-4 w-24 h-24 text-blue-500/5 group-hover:scale-110 transition-transform" />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Users</p>
                    <p className="text-4xl font-black text-slate-900">{stats?.total_patients + stats?.total_doctors || 0}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-green-600">
                        <TrendingUp size={14} /> +3 this week
                    </div>
                </div>
                <div className="card-hover bg-white p-8 rounded-[2rem] border border-slate-200 overflow-hidden relative group">
                    <UserCircle2 className="absolute -right-4 -top-4 w-24 h-24 text-green-500/5 group-hover:scale-110 transition-transform" />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Patient Registry</p>
                    <p className="text-4xl font-black text-slate-900">{stats?.total_patients}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-600">
                        <Activity size={14} /> {stats?.total_patients > 0 ? 'Active Records' : 'No Data'}
                    </div>
                </div>
                <div className="card-hover bg-white p-8 rounded-[2rem] border border-slate-200 overflow-hidden relative group">
                    <Calendar className="absolute -right-4 -top-4 w-24 h-24 text-orange-500/5 group-hover:scale-110 transition-transform" />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Appointments</p>
                    <p className="text-4xl font-black text-slate-900">{stats?.appointment_stats?.reduce((acc, curr) => acc + curr.count, 0) || 0}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-orange-600">
                        <Clock size={14} /> {stats?.appointment_stats?.find(s => s.status === 'pending')?.count || 0} Pending
                    </div>
                </div>
                <div className="card-hover bg-white p-8 rounded-[2rem] border border-slate-200 overflow-hidden relative group">
                    <Receipt className="absolute -right-4 -top-4 w-24 h-24 text-purple-500/5 group-hover:scale-110 transition-transform" />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Revenue</p>
                    <p className="text-4xl font-black text-slate-900">${stats?.total_revenue?.toLocaleString() || '0'}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-purple-600">
                        <TrendingUp size={14} /> High Performance
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 card bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                        <TrendingUp size={24} className="text-blue-600" />
                        Financial Trajectory
                    </h3>
                    <div className="h-[350px]">
                        <Line data={lineData} options={{
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, border: { display: false } },
                                x: { grid: { display: false }, border: { display: false } }
                            }
                        }} />
                    </div>
                </div>
                <div className="card bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-black text-slate-900 mb-8 text-center">Operation Status</h3>
                    <div className="h-[350px] flex items-center justify-center">
                        <Pie data={pieData} options={{
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { weight: 'bold' } } } }
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
