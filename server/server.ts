import http from "http";
import express from "express";
import path from "path";
import { Server } from "socket.io";
import { registerWebsocketHandlers } from "./websocket-handler";

const app = express();

// In production, the compiled server is inside:
// dist/server/server/
// So we go two levels up to:
// dist/
const distPath = path.join(__dirname, "../..");

app.use(express.static(distPath));

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
  });
});

registerWebsocketHandlers(io);

const PORT = Number(process.env.PORT) || 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log(`Server running on port ${PORT}`);
  console.log("Socket.IO server ready.");
  console.log("=================================");
});