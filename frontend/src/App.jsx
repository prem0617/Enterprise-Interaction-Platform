import { Route, Routes } from "react-router-dom";
import "./App.css";

import EmployeeLogin from "./pages/employee/EmployeeLogin";

import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EmployeeProfilePage from "./pages/employee/ProfilePage";
import ChangePasswordPage from "./pages/employee/ChangePasswordPage";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/adminLogin" element={<AdminLoginPage />} />
        <Route path="/adminDashboard" element={<AdminDashboard />} />

        <Route path="/login" element={<EmployeeLogin />} />
        <Route path="/dashboard" element={<EmployeeDashboard />} />
        <Route path="/profile" element={<EmployeeProfilePage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Routes>
    </div>
  );
}

export default App;
