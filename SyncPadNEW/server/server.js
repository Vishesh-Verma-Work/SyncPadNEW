
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173"
}));

app.use(express.json());

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Store active rooms and their document content
const rooms = new Map();

// Basic API route
app.get("/", (req, res) => {
  res.json({
    message: "SyncPad Backend is running!",
    status: "OK"
  });
});

// Socket connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join a document room
  socket.on("join-room", ({ roomId, username } = {}) => {
    if (
      typeof roomId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,50}$/.test(roomId)
    ) {
      socket.emit("room-error", "Invalid room ID");
      return;
    }

    // Leave previous room if switching rooms
    const previousRoom = socket.data.roomId;

    if (previousRoom) {
      leaveRoom(socket, previousRoom);
    }

    const safeUsername =
      typeof username === "string"
        ? username.trim().slice(0, 30) || "Anonymous"
        : "Anonymous";

    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        content: "",
        users: new Map()
      });
    }

    const room = rooms.get(roomId);

    // Join Socket.IO room
    socket.join(roomId);

    socket.data.roomId = roomId;
    socket.data.username = safeUsername;

    room.users.set(socket.id, safeUsername);

    // Send existing document to newly joined user
    socket.emit("room-joined", {
      roomId,
      content: room.content,
      users: Array.from(room.users.values()),
      userCount: room.users.size
    });

    // Notify other users
    socket.to(roomId).emit("user-joined", {
      username: safeUsername,
      users: Array.from(room.users.values()),
      userCount: room.users.size
    });

    console.log(`${safeUsername} joined room: ${roomId}`);
  });

  // Handle document changes
  socket.on("document-change", ({ content } = {}) => {
    const roomId = socket.data.roomId;

    if (!roomId || !rooms.has(roomId)) return;

    if (typeof content !== "string" || content.length > 1000000) {
      socket.emit("room-error", "Invalid or oversized document content");
      return;
    }

    const room = rooms.get(roomId);

    // Update server-side document
    room.content = content;

    // Broadcast changes to everyone except sender
    socket.to(roomId).emit("document-update", {
      content,
      updatedBy: socket.data.username
    });
  });

  // Leave room
  socket.on("leave-room", () => {
    const roomId = socket.data.roomId;

    if (roomId) {
      leaveRoom(socket, roomId);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;

    if (roomId) {
      leaveRoom(socket, roomId);
    }

    console.log("User disconnected:", socket.id);
  });
});

// Helper function to leave a room
function leaveRoom(socket, roomId) {
  const room = rooms.get(roomId);

  if (!room) return;

  const username = socket.data.username || "Anonymous";

  room.users.delete(socket.id);
  socket.leave(roomId);

  socket.data.roomId = null;

  // Notify remaining users
  io.to(roomId).emit("user-left", {
    username,
    users: Array.from(room.users.values()),
    userCount: room.users.size
  });

  console.log(`${username} left room: ${roomId}`);
}

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`SyncPad server running on port ${PORT}`);
});
