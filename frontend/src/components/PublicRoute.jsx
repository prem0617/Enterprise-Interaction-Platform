import { Navigate } from "react-router-dom";

const PublicRoute = ({ children }) => {
  const user = localStorage.getItem("adminData");

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/adminDashboard" replace />;
  }

  return children;
};

export default PublicRoute;
