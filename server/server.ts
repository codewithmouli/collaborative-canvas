import http from "http";
import express from "express";
import path from "path";
import { Server } from "socket.io";
import { registerWebsocketHandlers } from "./websocket-handler";

const app = express();

// =====================================================
// SERVE FRONTEND
// =====================================================

const distPath = path.join(__dirname, "..");

app.use(express.static(distPath));

// =====================================================
// HTTP SERVER
// =====================================================

const httpServer = http.createServer(app);

// =====================================================
// SOCKET.IO
// =====================================================

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// =====================================================
// BASIC HTTP ROUTE
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