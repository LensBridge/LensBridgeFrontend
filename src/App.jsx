import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import {
  PERMISSIONS,
  ADMIN_SECTION_PERMISSIONS,
  BOARD_SECTION_PERMISSIONS,
} from './utils/permissions';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Gallery from './pages/Gallery';
import AdminDashboard from './pages/AdminDashboard';
import BoardManagement from './pages/BoardManagement';
import DeviceList from './pages/DeviceList';
import EnrollDevice from './pages/EnrollDevice';
import DeviceDetail from './pages/DeviceDetail';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SignupSuccess from './pages/SignupSuccess';
import ConfirmEmail from './pages/ConfirmEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
          <Header />
          <main className="container mx-auto px-4 py-8 flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route 
                path="/upload" 
                element={
                  <ProtectedRoute>
                    <Upload />
                  </ProtectedRoute>
                } 
              />
              <Route path="/gallery" element={<Gallery />} />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/admin"
                element={
                  <PermissionRoute anyOf={ADMIN_SECTION_PERMISSIONS} label="the admin console">
                    <AdminDashboard />
                  </PermissionRoute>
                }
              />
              {/*
                Board routes gate on the narrowest permission that makes the page
                worth opening — a read, in every case but enrollment, which has
                nothing to show someone who cannot mint a token. Controls inside
                each page gate themselves; see src/utils/permissions.js.
              */}
              <Route
                path="/admin/board"
                element={
                  <PermissionRoute anyOf={BOARD_SECTION_PERMISSIONS} label="board management">
                    <BoardManagement />
                  </PermissionRoute>
                }
              />
              <Route
                path="/admin/devices"
                element={
                  <PermissionRoute anyOf={[PERMISSIONS.BOARD_DEVICE_READ]} label="the device fleet">
                    <DeviceList />
                  </PermissionRoute>
                }
              />
              <Route
                path="/admin/devices/enroll"
                element={
                  <PermissionRoute anyOf={[PERMISSIONS.BOARD_DEVICE_ENROLL]} label="device enrollment">
                    <EnrollDevice />
                  </PermissionRoute>
                }
              />
              <Route
                path="/admin/devices/:deviceId"
                element={
                  <PermissionRoute anyOf={[PERMISSIONS.BOARD_DEVICE_READ]} label="device details">
                    <DeviceDetail />
                  </PermissionRoute>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/signup-success" element={<SignupSuccess />} />
              <Route path="/verify-email" element={<ConfirmEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
