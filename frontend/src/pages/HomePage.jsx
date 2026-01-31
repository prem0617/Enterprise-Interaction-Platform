import React from "react";
import { useAuthContext } from "../context/AuthContextProvider";

const HomePage = () => {
  const { socket } = useAuthContext();

  if (!socket) return <div>Connecting...</div>;
  return <div>HomePage</div>;
};

export default HomePage;
