import {
  setupCanvas,
  setColor,
  setStrokeWidth,
  enableBrush,
  enableEraser,
  setCanvasState,
  setDrawCallback,
  setDrawPreviewCallback,
  setCursorCallback,
  drawRemotePreview,
} from "./canvas";

import {
  joinRoom,
  sendStroke,
  sendDrawPreview,
  sendCursorPosition,
  requestUndo,
  requestRedo,
  requestClear,
  onRoomJoined,
  onCanvasState,
  onUserCount,
  onConnectionChange,
  onRemoteDrawing,
  onRemoteDrawPreview,
  onRemoteCursor,
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
  throw new Error(
    "drawing-canvas not found"
  );
}

if (!brushButton) {
  throw new Error(
    "brush-tool not found"
  );
}

if (!eraserButton) {
  throw new Error(
    "eraser-tool not found"
  );
}

if (!colorPicker) {
  throw new Error(
    "color-picker not found"
  );
}

if (!strokeWidth) {
  throw new Error(
    "stroke-width not found"
  );
}

if (!strokeWidthValue) {
  throw new Error(
    "stroke-width-value not found"
  );
}

if (!undoButton) {
  throw new Error(
    "undo-button not found"
  );
}

if (!redoButton) {
  throw new Error(
    "redo-button not found"
  );
}

if (!clearButton) {
  throw new Error(
    "clear-button not found"
  );
}

if (!roomElement) {
  throw new Error(
    "room-id not found"
  );
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
// REMOTE CURSOR SYSTEM
// =====================================================

// Store remote cursor elements by user ID.
const remoteCursors =
  new Map<string, HTMLDivElement>();

// Remove inactive cursor after this amount of time.
const CURSOR_TIMEOUT = 3000;

const cursorTimers =
  new Map<string, number>();

// =====================================================
// USER CURSOR COLOR
// =====================================================

function getUserCursorColor(
  remoteUserId: string
): string {
  const colors = [
    "#e63946",
    "#457b9d",
    "#2a9d8f",
    "#f4a261",
    "#9b5de5",
    "#00b4d8",
    "#f72585",
    "#43aa8b",
  ];

  let hash = 0;

  for (
    let i = 0;
    i < remoteUserId.length;
    i++
  ) {
    hash =
      (
        hash * 31 +
        remoteUserId.charCodeAt(i)
      ) >>> 0;
  }

  return colors[
    hash % colors.length
  ];
}

// =====================================================
// CREATE REMOTE CURSOR
// =====================================================

function createRemoteCursor(
  remoteUserId: string
): HTMLDivElement {
  const cursor =
    document.createElement("div");

  const color =
    getUserCursorColor(
      remoteUserId
    );

  cursor.className =
    "remote-user-cursor";

  cursor.style.position =
    "fixed";

  cursor.style.width =
    "0px";

  cursor.style.height =
    "0px";

  cursor.style.zIndex =
    "9999";

  cursor.style.pointerEvents =
    "none";

  cursor.style.transform =
    "translate(-2px, -2px)";

  cursor.innerHTML = `
    <div
      style="
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 16px solid ${color};
        transform: rotate(-45deg);
        transform-origin: center;
      "
    ></div>

    <div
      style="
        position: absolute;
        left: 10px;
        top: 10px;
        padding: 3px 7px;
        border-radius: 8px;
        background: ${color};
        color: white;
        font-family: Arial, sans-serif;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      "
    >
      ${remoteUserId}
    </div>
  `;

  document.body.appendChild(
    cursor
  );

  return cursor;
}

// =====================================================
// SHOW REMOTE CURSOR
// =====================================================

function showRemoteCursor(
  remoteUserId: string,
  x: number,
  y: number
): void {
  if (
    remoteUserId === userId
  ) {
    return;
  }

  if (!canvas) {
    return;
  }

  let cursor =
    remoteCursors.get(
      remoteUserId
    );

  if (!cursor) {
    cursor =
      createRemoteCursor(
        remoteUserId
      );

    remoteCursors.set(
      remoteUserId,
      cursor
    );
  }

  const rect =
    canvas.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return;
  }

  const scaleX =
    rect.width / canvas.width;

  const scaleY =
    rect.height / canvas.height;

  const screenX =
    rect.left +
    x * scaleX;

  const screenY =
    rect.top +
    y * scaleY;

  cursor.style.left =
    `${screenX}px`;

  cursor.style.top =
    `${screenY}px`;

  cursor.style.display =
    "block";

  // Reset the hide timer.
  const oldTimer =
    cursorTimers.get(
      remoteUserId
    );

  if (oldTimer !== undefined) {
    window.clearTimeout(
      oldTimer
    );
  }

  const newTimer =
    window.setTimeout(
      () => {
        cursor.style.display =
          "none";
      },
      CURSOR_TIMEOUT
    );

  cursorTimers.set(
    remoteUserId,
    newTimer
  );
}

// =====================================================
// REMOVE REMOTE CURSOR
// =====================================================

function removeRemoteCursor(
  remoteUserId: string
): void {
  const cursor =
    remoteCursors.get(
      remoteUserId
    );

  if (cursor) {
    cursor.remove();

    remoteCursors.delete(
      remoteUserId
    );
  }

  const timer =
    cursorTimers.get(
      remoteUserId
    );

  if (timer !== undefined) {
    window.clearTimeout(
      timer
    );

    cursorTimers.delete(
      remoteUserId
    );
  }
}

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

setColor(
  colorPicker.value
);

setStrokeWidth(
  Number(
    strokeWidth.value
  )
);

enableBrush();

brushButton.classList.add(
  "active"
);

eraserButton.classList.remove(
  "active"
);

// =====================================================
// LOCAL CURSOR POSITION
// =====================================================

setCursorCallback(
  (x, y) => {
    sendCursorPosition(
      roomId,
      x,
      y
    );
  }
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
// REMOTE FINAL DRAWING
// =====================================================

onRemoteDrawing(
  (data) => {
    console.log(
      "Remote drawing received:",
      data.points.length,
      "points"
    );

    /*
     * The final committed stroke is handled
     * through the authoritative canvas state
     * sent by the server.
     *
     * This keeps undo/redo globally synchronized.
     */
  }
);

// =====================================================
// REMOTE REAL-TIME DRAWING PREVIEW
// =====================================================

onRemoteDrawPreview(
  (data) => {
    drawRemotePreview(
      data.userId,
      data.strokeId,
      data.points,
      data.color,
      data.width,
      data.eraser
    );
  }
);

// =====================================================
// REMOTE CURSOR
// =====================================================

onRemoteCursor(
  (data) => {
    showRemoteCursor(
      data.userId,
      data.x,
      data.y
    );
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

    // If there is only one user,
    // old remote cursors are no longer needed.
    if (data.count <= 1) {
      for (
        const remoteUserId of
          remoteCursors.keys()
      ) {
        removeRemoteCursor(
          remoteUserId
        );
      }
    }
  }
);

// =====================================================
// FINAL DRAW CALLBACK
// =====================================================

setDrawCallback(
  (
    strokeId,
    points,
    color,
    width,
    eraser
  ) => {
    console.log(
      "Stroke created:",
      strokeId,
      points.length,
      "points"
    );

    /*
     * Send ONE final committed stroke.
     *
     * Preview points are not stored in
     * the server history.
     *
     * Therefore one complete user action
     * remains one undo/redo operation.
     */

    sendStroke(
      roomId,
      strokeId,
      points,
      color,
      width,
      eraser
    );
  }
);

// =====================================================
// REAL-TIME PREVIEW CALLBACK
// =====================================================

setDrawPreviewCallback(
  (
    strokeId,
    points,
    color,
    width,
    eraser
  ) => {
    /*
     * Preview data is sent while the user
     * is actively drawing.
     *
     * The server forwards it to other users
     * but does not add it to history.
     */

    sendDrawPreview(
      roomId,
      strokeId,
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