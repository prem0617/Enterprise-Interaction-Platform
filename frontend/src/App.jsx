import { Route, Routes } from "react-router-dom";
import "./App.css";

import JoinMeetingPage from "@/pages/JoinMeetingPage";
import EmployeeLogin from "@/pages/employee/EmployeeLogin";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import EmployeeProfilePage from "./pages/employee/ProfilePage";
import ChangePasswordPage from "./pages/employee/ChangePasswordPage";

import AuthContextProvider from "./context/AuthContextProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <AuthContextProvider>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <EmployeeLogin />
            </PublicRoute>
          }
        />

        <Route
          path="/adminLogin"
          element={
            <PublicRoute>
              <AdminLoginPage />
            </PublicRoute>
          }
        />

        <Route path="/join/:code" element={<JoinMeetingPage />} />

        {/* EMPLOYEE PROTECTED */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <EmployeeProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />

        {/* ADMIN PROTECTED */}
        <Route
          path="/adminDashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />
      </Routes>

      <Toaster position="top-right" richColors duration={3000} />
    </AuthContextProvider>
  );
}

export default App;
