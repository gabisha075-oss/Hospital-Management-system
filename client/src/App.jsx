import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import Departments from './pages/Departments';
import Doctors from './pages/Doctors';
import AdminPatients from './pages/AdminPatients';
import Staff from './pages/Staff';
import BookAppointment from './pages/BookAppointment';
import PharmacistDashboard from './pages/PharmacistDashboard';
import LabDashboard from './pages/LabDashboard';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import PatientBills from './pages/PatientBills';
import PatientReports from './pages/PatientReports';
import LandingPage from './pages/LandingPage';
import BedManagementPage from './pages/BedManagementPage';
import LabTestingPage from './pages/LabTestingPage';
import PatientAdmissionPage from './pages/PatientAdmissionPage';
import LivePatientFlowPage from './pages/LivePatientFlowPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Placeholder = ({ title }) => (
  <div className="card">
    <h2 className="text-xl font-bold mb-4">{title}</h2>
    <p className="text-slate-500 italic text-sm">Module coming soon...</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<DashboardLayout />}>

            {/* Admin Routes */}
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/departments" element={<Departments />} />
            <Route path="admin/doctors" element={<Doctors />} />
            <Route path="admin/patients" element={<AdminPatients />} />
            <Route path="admin/beds" element={<BedManagementPage />} />
            <Route path="admin/lab-tests" element={<LabTestingPage />} />
            <Route path="admin/admission" element={<PatientAdmissionPage />} />
            <Route path="admin/live-flow" element={<LivePatientFlowPage />} />
            <Route path="admin/staff" element={<Staff />} />
            <Route path="admin/settings" element={<Placeholder title="Settings" />} />

            {/* Doctor Routes */}
            <Route path="doctor" element={<DoctorDashboard />} />
            <Route path="doctor/appointments" element={<DoctorDashboard />} />
            <Route path="doctor/patients" element={<DoctorDashboard />} />
            <Route path="doctor/lab-tests" element={<LabTestingPage />} />

            {/* Patient Routes */}
            <Route path="patient" element={<PatientDashboard />} />
            <Route path="patient/book" element={<BookAppointment />} />
            <Route path="patient/bills" element={<PatientBills />} />
            <Route path="patient/reports" element={<PatientReports />} />

            {/* Specialist Staff Routes */}
            <Route path="receptionist" element={<ReceptionistDashboard />} />
            <Route path="receptionist/live-flow" element={<LivePatientFlowPage />} />
            <Route path="receptionist/admission" element={<PatientAdmissionPage />} />
            <Route path="receptionist/beds" element={<BedManagementPage />} />
            <Route path="pharmacist" element={<PharmacistDashboard />} />
            <Route path="lab" element={<LabDashboard />} />
            <Route path="lab/tests" element={<LabTestingPage />} />
          </Route>
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </Router>
    </AuthProvider>
  );
}

export default App;
