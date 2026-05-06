import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    Calendar,
    FileText,
    Settings,
    LogOut,
    Building2,
    Stethoscope,
    Pill,
    Microscope,
    Receipt,
    PlusCircle,
    UserCheck,
    Bed,
    TestTube,
    Activity,
    UserPlus
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = {
        admin: [
            { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
            { name: 'Departments', path: '/admin/departments', icon: <Building2 size={20} /> },
            { name: 'Doctors', path: '/admin/doctors', icon: <Stethoscope size={20} /> },
            { name: 'Patients', path: '/admin/patients', icon: <Users size={20} /> },
            { name: 'Bed Management', path: '/admin/beds', icon: <Bed size={20} /> },
            { name: 'Lab Testing', path: '/admin/lab-tests', icon: <TestTube size={20} /> },
            { name: 'Patient Admission', path: '/admin/admission', icon: <UserPlus size={20} /> },
            { name: 'Manage Staff', path: '/admin/staff', icon: <UserCheck size={20} /> },
            { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
        ],
        doctor: [
            { name: 'Appointments', path: '/doctor/appointments', icon: <Calendar size={20} /> },
            { name: 'My Patients', path: '/doctor/patients', icon: <Users size={20} /> },
            { name: 'Lab Testing', path: '/doctor/lab-tests', icon: <TestTube size={20} /> },
        ],
        patient: [
            { name: 'Health Portal', path: '/patient', icon: <LayoutDashboard size={20} /> },
            { name: 'Book Appointment', path: '/patient/book', icon: <PlusCircle size={20} /> },
            { name: 'My Bills', path: '/patient/bills', icon: <Receipt size={20} /> },
            { name: 'Lab Reports', path: '/patient/reports', icon: <FileText size={20} /> },
        ],
        receptionist: [
            { name: 'Front Desk', path: '/receptionist', icon: <Users size={20} /> },
            { name: 'Patient Admission', path: '/receptionist/admission', icon: <UserPlus size={20} /> },
            { name: 'Bed Management', path: '/receptionist/beds', icon: <Bed size={20} /> },
        ],
        pharmacist: [
            { name: 'Pharmacy', path: '/pharmacist', icon: <Pill size={20} /> },
        ],
        lab: [
            { name: 'Lab Tech', path: '/lab', icon: <Microscope size={20} /> },
            { name: 'Lab Testing', path: '/lab/tests', icon: <TestTube size={20} /> },
        ]
    };

    const currentItems = navItems[user?.role] || [];

    return (
        <div className="w-64 bg-slate-900 h-screen fixed left-0 top-0 text-slate-300 flex flex-col">
            <div className="p-8 flex items-center gap-3 text-white border-b border-slate-800">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">H</div>
                <span className="text-xl font-bold tracking-tight">Health<span className="text-blue-500">Quest</span></span>
            </div>

            <nav className="flex-1 p-6 space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 px-2">Main Menu</p>
                {currentItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'hover:bg-slate-800 hover:text-white'
                            }`
                        }
                    >
                        {item.icon}
                        <span className="font-medium">{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-6 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all font-medium"
                >
                    <LogOut size={20} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
