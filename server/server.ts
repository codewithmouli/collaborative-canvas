import http from "http";
import express from "express";
import { Server } from "socket.io";
import { registerWebsocketHandlers } from "./websocket-handler";

const app = express();

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// =====================================================
// BASIC HTTP ROUTE
// =====================================================

app.get("/", (_req, res) => {
  res.json({
    message: "Collaborative Canvas Server is running",
    status: "ok",
  });
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
  });
});

// =====================================================
// SOCKET.IO
// =====================================================

registerWebsocketHandlers(io);

// =====================================================
// START SERVER
// =====================================================

const PORT = Number(process.env.PORT) || 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log(`Server running on port ${PORT}`);
  console.log("Socket.IO server ready.");
  console.log("=================================");
});