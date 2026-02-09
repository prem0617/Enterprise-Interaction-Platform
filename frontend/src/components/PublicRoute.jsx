import { Navigate } from "react-router-dom";

const PublicRoute = ({ children }) => {
  const adminData = localStorage.getItem("adminData");
  const userData = localStorage.getItem("user");

  // If already logged in, redirect to the appropriate dashboard
  if (adminData) {
    return <Navigate to="/adminDashboard" replace />;
  }

  if (userData) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PublicRoute;
