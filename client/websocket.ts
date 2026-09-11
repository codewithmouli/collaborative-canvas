import { io, Socket } from "socket.io-client";
import type { Point, Stroke } from "./types";

// =====================================================
// SOCKET CONNECTION
// =====================================================

const socket: Socket = io("http://localhost:3000", {
  autoConnect: true,
  transports: ["polling", "websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

// =====================================================
// PENDING ROOM
// =====================================================

let pendingRoomId: string | null = null;
let pendingUserId: string | null = null;

// =====================================================
// CALLBACKS
// =====================================================

let connectionCallback:
  | ((connected: boolean) => void)
  | null = null;

let latencyCallback:
  | ((latency: number) => void)
  | null = null;

let latencyStartTime = 0;

// =====================================================
// CONNECTION
// =====================================================

socket.on("connect", () => {
  console.log(
    "Connected to server:",
    socket.id
  );

  if (connectionCallback) {
    connectionCallback(true);
  }

  // Automatically join the room after connection.
  if (
    pendingRoomId &&
    pendingUserId
  ) {
    console.log(
      "Joining room after connection:",
      pendingRoomId
    );

    socket.emit("join-room", {
      roomId: pendingRoomId,
      userId: pendingUserId,
    });
  }
});

// =====================================================
// DISCONNECT
// =====================================================

socket.on(
  "disconnect",
  (reason) => {
    console.log(
      "Disconnected:",
      reason
    );

    if (connectionCallback) {
      connectionCallback(false);
    }
  }
);

// =====================================================
// CONNECTION ERROR
// =====================================================

socket.on(
  "connect_error",
  (error) => {
    console.error(
      "Socket connection error:",
      error.message
    );

    if (connectionCallback) {
      connectionCallback(false);
    }
  }
);

// =====================================================
// CONNECTION STATUS
// =====================================================

export function onConnectionChange(
  callback: (connected: boolean) => void
): void {
  connectionCallback = callback;

  if (socket.connected) {
    callback(true);
  } else {
    callback(false);
  }
}

// =====================================================
// JOIN ROOM
// =====================================================

export function joinRoom(
  roomId: string,
  userId: string
): void {
  // Remember the room.
  pendingRoomId = roomId;
  pendingUserId = userId;

  // If already connected, join immediately.
  if (socket.connected) {
    console.log(
      "Joining room:",
      roomId
    );

    socket.emit(
      "join-room",
      {
        roomId,
        userId,
      }
    );

    return;
  }

  // Otherwise the connect handler
  // will join automatically.
  console.log(
    "Waiting for socket connection..."
  );
}

// =====================================================
// SEND STROKE
// =====================================================

export function sendStroke(
  roomId: string,
  points: Point[],
  color: string,
  width: number,
  eraser: boolean
): void {
  if (!socket.connected) {
    console.warn(
      "Cannot send stroke: socket not connected."
    );

    return;
  }

  socket.emit(
    "draw",
    {
      roomId,
      points,
      color,
      width,
      eraser,
    }
  );
}

// =====================================================
// UNDO
// =====================================================

export function requestUndo(
  roomId: string
): void {
  if (!socket.connected) {
    console.warn(
      "Cannot undo: socket not connected."
    );

    return;
  }

  console.log(
    "Requesting undo..."
  );

  socket.emit(
    "undo",
    {
      roomId,
    }
  );
}

// =====================================================
// REDO
// =====================================================

export function requestRedo(
  roomId: string
): void {
  if (!socket.connected) {
    console.warn(
      "Cannot redo: socket not connected."
    );

    return;
  }

  console.log(
    "Requesting redo..."
  );

  socket.emit(
    "redo",
    {
      roomId,
    }
  );
}

// =====================================================
// CLEAR
// =====================================================

export function requestClear(
  roomId: string
): void {
  if (!socket.connected) {
    console.warn(
      "Cannot clear: socket not connected."
    );

    return;
  }

  console.log(
    "Requesting clear..."
  );

  socket.emit(
    "clear",
    {
      roomId,
    }
  );
}

// =====================================================
// CURSOR
// =====================================================

export function sendCursorPosition(
  roomId: string,
  x: number,
  y: number
): void {
  if (!socket.connected) {
    return;
  }

  socket.emit(
    "cursor-move",
    {
      roomId,
      x,
      y,
    }
  );
}

// =====================================================
// ROOM JOINED
// =====================================================

export function onRoomJoined(
  callback: (data: {
    roomId: string;
    userId: string;
  }) => void
): void {
  socket.on(
    "room-joined",
    callback
  );
}

// =====================================================
// USER JOINED
// =====================================================

export function onUserJoined(
  callback: (data: {
    userId: string;
  }) => void
): void {
  socket.on(
    "user-joined",
    callback
  );
}

// =====================================================
// CANVAS STATE
// =====================================================

export function onCanvasState(
  callback: (data: {
    strokes: Stroke[];
  }) => void
): void {
  socket.on(
    "canvas-state",
    callback
  );
}

// =====================================================
// REMOTE DRAWING
// =====================================================

export function onRemoteDrawing(
  callback: (data: {
    userId: string;
    points: Point[];
    color: string;
    width: number;
    eraser: boolean;
  }) => void
): void {
  socket.on(
    "draw",
    callback
  );
}

// =====================================================
// REMOTE CURSOR
// =====================================================

export function onRemoteCursor(
  callback: (data: {
    userId: string;
    x: number;
    y: number;
  }) => void
): void {
  socket.on(
    "cursor-move",
    callback
  );
}

// =====================================================
// USER COUNT
// =====================================================

export function onUserCount(
  callback: (data: {
    count: number;
  }) => void
): void {
  socket.on(
    "user-count",
    callback
  );
}

// =====================================================
// REMOTE CLEAR
// =====================================================

export function onRemoteClear(
  callback: () => void
): void {
  socket.on(
    "clear",
    callback
  );
}

// =====================================================
// LATENCY CALLBACK
// =====================================================

export function onLatency(
  callback: (latency: number) => void
): void {
  latencyCallback = callback;
}

// =====================================================
// CHECK LATENCY
// =====================================================

export function checkLatency(): void {
  if (!socket.connected) {
    console.warn(
      "Cannot check latency: socket not connected."
    );

    return;
  }

  latencyStartTime =
    Date.now();

  socket.emit(
    "ping-check"
  );
}

// =====================================================
// LATENCY RESPONSE
// =====================================================

socket.on(
  "pong-check",
  () => {
    if (
      latencyStartTime === 0
    ) {
      return;
    }

    const latency =
      Date.now() -
      latencyStartTime;

    latencyStartTime = 0;

    console.log(
      "Latency:",
      latency,
      "ms"
    );

    if (latencyCallback) {
      latencyCallback(
        latency
      );
    }
  }
);

// =====================================================
// SOCKET ID
// =====================================================

export function getSocketId():
  string | undefined {
  return socket.id;
}

// =====================================================
// CONNECTION CHECK
// =====================================================

export function isSocketConnected():
  boolean {
  return socket.connected;
}