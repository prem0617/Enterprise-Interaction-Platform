import { Server } from "socket.io";
import express from "express";
import { createServer } from "http";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const users = {};

io.on("connection", async (socket) => {
  console.log("first");
  console.log(`Socket connected: ${socket.id}`);

  socket.on("message", (msg) => {
    console.log("Message received:", msg);
  });

  const userId = socket.handshake.auth.userId;
  // console.log(userId, "user id");
  if (userId) {
    users[userId] = socket.id;
    // console.log("Users Map:", users);

    //   const usersRoom = await userModel.findById(userId).select("rooms");

    //   // console.log(usersRoom, "users room");

    //   usersRoom.rooms.forEach((room) => socket.join(room));
  }
  console.log({ users });
  // console.log(users, "users");

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);

    if (userId) {
      delete users[userId];
    }
  });
});

export const getReceiverSocketId = (receiverId) => {
  // console.log(receiverId, "receiver id");
  return users[receiverId];
};

export { app, server, io };
