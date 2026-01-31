// context/AuthContextProvider.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { createSocketConnection } from "../hooks/useSocket";

const AuthContext = createContext(null);

export default function AuthContextProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);

  // Load user from localStorage
  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") || localStorage.getItem("adminData");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []); // Remove 'user' from dependencies to avoid infinite loop
  console.log(user);

  // Create socket connection when user is available
  useEffect(() => {
    if (!user || !user.id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = createSocketConnection(user.id);
    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user?.id]); // Only reconnect when user.id changes

  return (
    <AuthContext.Provider
      value={{
        loading,
        user,
        setUser,
        setLoading,
        socket,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuthContext must be used within AuthContextProvider");
  }
  return context;
}
