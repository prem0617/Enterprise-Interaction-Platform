import { Navigate } from "react-router-dom";

const AdminProtectedRoute = ({ children }) => {
  const admin = localStorage.getItem("adminData");
  //   console.log(admin);
  if (!admin) {
    return <Navigate to="/adminLogin" replace />;
  }

  return children;
};

export default AdminProtectedRoute;
