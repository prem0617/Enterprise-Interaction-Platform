import { Route, Routes } from "react-router-dom";

import EmployeeLogin from "./pages/employee/EmployeeLogin";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import ProfilePage from "./pages/employee/ProfilePage";
import ChangePasswordPage from "./pages/employee/ChangePasswordPage";

import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminSignupPage from "./pages/admin/AdminSignupPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Whiteboard from "./pages/admin/Whiteboard";

function App() {
  return (
    <Routes>
      {/* Admin Routes */}
      <Route path="/adminLogin" element={<AdminLoginPage />} />
      <Route path="/adminSignup" element={<AdminSignupPage />} />
      <Route path="/adminDashboard" element={<AdminDashboard />} />

      {/* Employee Routes */}
      <Route path="/login" element={<EmployeeLogin />} />
      <Route path="/dashboard" element={<EmployeeDashboard />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

      {/* Whiteboard Routes */}
      <Route path="/whiteboard" element={<Whiteboard />} />
      <Route path="/whiteboard/:sessionId" element={<Whiteboard />} />

      {/* Default redirect */}
      <Route path="/" element={<EmployeeLogin />} />
    </Routes>
  );
}

export default App;
