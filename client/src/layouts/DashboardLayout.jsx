import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const DashboardLayout = () => {
    const { user, loading } = useAuth();

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
    );

    if (!user) return <Navigate to="/login" replace />;

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />
            <Navbar />
            <main className="pl-64 pt-16 min-h-screen">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
