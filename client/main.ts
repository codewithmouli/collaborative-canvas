import {
  setupCanvas,
  setColor,
  setStrokeWidth,
  enableBrush,
  enableEraser,
  setCanvasState,
  setDrawCallback,
} from "./canvas";

import {
  joinRoom,
  sendStroke,
  requestUndo,
  requestRedo,
  requestClear,
  onRoomJoined,
  onCanvasState,
  onUserCount,
  onConnectionChange,
  onRemoteDrawing,
  checkLatency,
  onLatency,
} from "./websocket";

// =====================================================
// ROOM
// =====================================================

const roomId = "main-room";

// =====================================================
// USER
// =====================================================

const userId =
  `user-${Math.random()
    .toString(36)
    .substring(2, 9)}`;

console.log("=================================");
console.log("COLLABORATIVE CANVAS");
console.log("User ID:", userId);
console.log("Room:", roomId);
console.log("=================================");

// =====================================================
// DOM ELEMENTS
// =====================================================

const canvas =
  document.getElementById(
    "drawing-canvas"
  ) as HTMLCanvasElement | null;

const brushButton =
  document.getElementById(
    "brush-tool"
  ) as HTMLButtonElement | null;

const eraserButton =
  document.getElementById(
    "eraser-tool"
  ) as HTMLButtonElement | null;

const colorPicker =
  document.getElementById(
    "color-picker"
  ) as HTMLInputElement | null;

const strokeWidth =
  document.getElementById(
    "stroke-width"
  ) as HTMLInputElement | null;

const strokeWidthValue =
  document.getElementById(
    "stroke-width-value"
  ) as HTMLElement | null;

const undoButton =
  document.getElementById(
    "undo-button"
  ) as HTMLButtonElement | null;

const redoButton =
  document.getElementById(
    "redo-button"
  ) as HTMLButtonElement | null;

const clearButton =
  document.getElementById(
    "clear-button"
  ) as HTMLButtonElement | null;

const roomElement =
  document.getElementById(
    "room-id"
  ) as HTMLElement | null;

const connectionStatus =
  document.getElementById(
    "connection-status"
  ) as HTMLElement | null;

const usersElement =
  document.getElementById(
    "user-count"
  ) as HTMLElement | null;

const latencyElement =
  document.getElementById(
    "latency"
  ) as HTMLElement | null;

// =====================================================
// VALIDATION
// =====================================================

if (!canvas) {
  throw new Error("drawing-canvas not found");
}

if (!brushButton) {
  throw new Error("brush-tool not found");
}

if (!eraserButton) {
  throw new Error("eraser-tool not found");
}

if (!colorPicker) {
  throw new Error("color-picker not found");
}

if (!strokeWidth) {
  throw new Error("stroke-width not found");
}

if (!strokeWidthValue) {
  throw new Error(
    "stroke-width-value not found"
  );
}

if (!undoButton) {
  throw new Error("undo-button not found");
}

if (!redoButton) {
  throw new Error("redo-button not found");
}

if (!clearButton) {
  throw new Error("clear-button not found");
}

if (!roomElement) {
  throw new Error("room-id not found");
}

if (!connectionStatus) {
  throw new Error(
    "connection-status not found"
  );
}

if (!usersElement) {
  throw new Error(
    "user-count not found"
  );
}

if (!latencyElement) {
  throw new Error(
    "latency not found"
  );
}

// =====================================================
// ROOM DISPLAY
// =====================================================

roomElement.textContent = roomId;

// =====================================================
// INITIAL CANVAS SETUP
// =====================================================

setupCanvas(canvas);

console.log(
  "Canvas setup completed."
);

// =====================================================
// DEFAULT DRAWING SETTINGS
// =====================================================

setColor(colorPicker.value);

setStrokeWidth(
  Number(strokeWidth.value)
);

enableBrush();

brushButton.classList.add(
  "active"
);

eraserButton.classList.remove(
  "active"
);

// =====================================================
// CONNECTION STATUS
// =====================================================

let roomJoined = false;

onConnectionChange(
  (connected) => {

    if (connected) {

      connectionStatus.textContent =
        "Connected";

      connectionStatus.classList.remove(
        "disconnected"
      );

      connectionStatus.classList.add(
        "connected"
      );

      console.log(
        "Connected to server."
      );

      // Join the room only after
      // the socket is connected.
      if (!roomJoined) {

        joinRoom(
          roomId,
          userId
        );
      }

    } else {

      connectionStatus.textContent =
        "Disconnected";

      connectionStatus.classList.remove(
        "connected"
      );

      connectionStatus.classList.add(
        "disconnected"
      );

      roomJoined = false;

      console.log(
        "Disconnected from server."
      );
    }
  }
);

// =====================================================
// ROOM JOINED
// =====================================================

onRoomJoined(
  (data) => {

    console.log(
      "Room joined:",
      data
    );

    roomJoined = true;

    connectionStatus.textContent =
      "Connected";

    connectionStatus.classList.remove(
      "disconnected"
    );

    connectionStatus.classList.add(
      "connected"
    );
  }
);

// =====================================================
// CANVAS STATE
// =====================================================

onCanvasState(
  (data) => {

    console.log(
      "Canvas state received:",
      data.strokes.length,
      "strokes"
    );

    setCanvasState(
      data.strokes
    );
  }
);

// =====================================================
// REMOTE DRAWING
// =====================================================

onRemoteDrawing(
  (data) => {

    console.log(
      "Remote drawing received:",
      data.points.length,
      "points"
    );

    /*
     * The server sends the complete canvas
     * state after drawing changes.
     *
     * Therefore setCanvasState()
     * handles the actual redraw.
     */
  }
);

// =====================================================
// USER COUNT
// =====================================================

onUserCount(
  (data) => {

    usersElement.textContent =
      `Users: ${data.count}`;

    console.log(
      "Users:",
      data.count
    );
  }
);

// =====================================================
// DRAW CALLBACK
// =====================================================

setDrawCallback(
  (
    points,
    color,
    width,
    eraser
  ) => {

    console.log(
      "Stroke created:",
      points.length,
      "points"
    );

    sendStroke(
      roomId,
      points,
      color,
      width,
      eraser
    );
  }
);

// =====================================================
// BRUSH BUTTON
// =====================================================

brushButton.addEventListener(
  "click",
  () => {

    enableBrush();

    brushButton.classList.add(
      "active"
    );

    eraserButton.classList.remove(
      "active"
    );

    console.log(
      "Brush selected."
    );
  }
);

// =====================================================
// ERASER BUTTON
// =====================================================

eraserButton.addEventListener(
  "click",
  () => {

    enableEraser();

    eraserButton.classList.add(
      "active"
    );

    brushButton.classList.remove(
      "active"
    );

    console.log(
      "Eraser selected."
    );
  }
);

// =====================================================
// COLOR PICKER
// =====================================================

colorPicker.addEventListener(
  "input",
  () => {

    setColor(
      colorPicker.value
    );

    enableBrush();

    brushButton.classList.add(
      "active"
    );

    eraserButton.classList.remove(
      "active"
    );

    console.log(
      "Color changed:",
      colorPicker.value
    );
  }
);

// =====================================================
// STROKE WIDTH
// =====================================================

strokeWidth.addEventListener(
  "input",
  () => {

    const width =
      Number(
        strokeWidth.value
      );

    setStrokeWidth(
      width
    );

    strokeWidthValue.textContent =
      String(width);

    console.log(
      "Stroke width:",
      width
    );
  }
);

// =====================================================
// UNDO BUTTON
// =====================================================

undoButton.addEventListener(
  "click",
  () => {

    console.log(
      "Undo requested."
    );

    requestUndo(
      roomId
    );
  }
);

// =====================================================
// REDO BUTTON
// =====================================================

redoButton.addEventListener(
  "click",
  () => {

    console.log(
      "Redo requested."
    );

    requestRedo(
      roomId
    );
  }
);

// =====================================================
// CLEAR BUTTON
// =====================================================

clearButton.addEventListener(
  "click",
  () => {

    const confirmed =
      window.confirm(
        "Clear the entire canvas?"
      );

    if (!confirmed) {
      return;
    }

    console.log(
      "Clear requested."
    );

    requestClear(
      roomId
    );
  }
);

// =====================================================
// LATENCY
// =====================================================

onLatency(
  (latency) => {

    latencyElement.textContent =
      `Latency: ${latency} ms`;

    console.log(
      "Latency:",
      latency,
      "ms"
    );
  }
);

// =====================================================
// LATENCY CHECK
// =====================================================

setTimeout(
  () => {

    checkLatency();

  },
  1500
);

setInterval(
  () => {

    checkLatency();

  },
  5000
);

// =====================================================
// START
// =====================================================

console.log(
  "Canvas initialized successfully."
);