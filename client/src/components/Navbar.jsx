import { useAuth } from '../context/AuthContext';
import { User, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleNotificationClick = () => {
        if (!user?.role) return;
        if (user.role === 'receptionist') {
            navigate('/receptionist', { state: { openAdmissionRequests: true, ts: Date.now() } });
            return;
        }
        navigate(`/${user.role}`);
    };

    return (
        <nav className="bg-white border-b h-16 fixed top-0 right-0 left-64 z-10 px-8 flex items-center justify-between">
            <div className="text-slate-500 font-medium">
                Welcome back, <span className="text-blue-700">{user?.name}</span>
            </div>
            <div className="flex items-center gap-6">
                <button
                    type="button"
                    onClick={handleNotificationClick}
                    className="text-slate-400 hover:text-slate-600 relative"
                >
                    <Bell size={20} />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                <div className="flex items-center gap-3 pl-6 border-l">
                    <div className="text-right">
                        <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
                        <div className="text-xs text-slate-500 capitalize">{user?.role}</div>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                        {user?.name?.[0]?.toUpperCase()}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
