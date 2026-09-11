import type { Point, Stroke } from "./types";

// =====================================================
// CANVAS VARIABLES
// =====================================================

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

let isDrawing = false;
let currentStroke: Point[] = [];

let currentColor = "#111111";
let currentWidth = 5;
let isEraser = false;

let canvasStrokes: Stroke[] = [];

// =====================================================
// REAL-TIME PREVIEW VARIABLES
// =====================================================

let currentStrokeId: string | null = null;

let lastPreviewSentIndex = 0;
let previewTimer: number | null = null;

const PREVIEW_INTERVAL = 25;

// Temporary remote previews.
// These are NOT committed strokes.
// Therefore they are NOT part of undo/redo.
const remotePreviews = new Map<string, Stroke>();

// =====================================================
// CALLBACK TYPES
// =====================================================

type DrawCallback = (
  strokeId: string,
  points: Point[],
  color: string,
  width: number,
  eraser: boolean
) => void;

type DrawPreviewCallback = (
  strokeId: string,
  points: Point[],
  color: string,
  width: number,
  eraser: boolean
) => void;

type CursorCallback = (
  x: number,
  y: number
) => void;

// =====================================================
// CALLBACK VARIABLES
// =====================================================

let drawCallback: DrawCallback | null = null;
let drawPreviewCallback: DrawPreviewCallback | null = null;
let cursorCallback: CursorCallback | null = null;

// =====================================================
// SET DRAW CALLBACK
// =====================================================

export function setDrawCallback(
  callback: DrawCallback
): void {
  drawCallback = callback;
}

// =====================================================
// SET DRAW PREVIEW CALLBACK
// =====================================================

export function setDrawPreviewCallback(
  callback: DrawPreviewCallback
): void {
  drawPreviewCallback = callback;
}

// =====================================================
// SET CURSOR CALLBACK
// =====================================================

export function setCursorCallback(
  callback: CursorCallback
): void {
  cursorCallback = callback;
}

// =====================================================
// SETUP CANVAS
// =====================================================

export function setupCanvas(
  canvasElement: HTMLCanvasElement
): void {
  canvas = canvasElement;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Could not get canvas 2D context."
    );
  }

  ctx = context;

  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.style.webkitUserSelect = "none";

  resizeCanvas();

  // Prevent duplicate event listeners.
  canvas.removeEventListener(
    "pointerdown",
    handlePointerDown
  );

  canvas.removeEventListener(
    "pointermove",
    handlePointerMove
  );

  canvas.removeEventListener(
    "pointerup",
    handlePointerUp
  );

  canvas.removeEventListener(
    "pointercancel",
    handlePointerUp
  );

  canvas.addEventListener(
    "pointerdown",
    handlePointerDown
  );

  canvas.addEventListener(
    "pointermove",
    handlePointerMove
  );

  canvas.addEventListener(
    "pointerup",
    handlePointerUp
  );

  canvas.addEventListener(
    "pointercancel",
    handlePointerUp
  );

  window.removeEventListener(
    "resize",
    resizeCanvas
  );

  window.addEventListener(
    "resize",
    resizeCanvas
  );

  updateContext();

  console.log(
    "Canvas setup completed."
  );
}

// =====================================================
// RESIZE CANVAS
// =====================================================

function resizeCanvas(): void {
  if (!canvas || !ctx) {
    return;
  }

  const rect =
    canvas.getBoundingClientRect();

  const width = Math.max(
    1,
    Math.round(rect.width)
  );

  const height = Math.max(
    1,
    Math.round(rect.height)
  );

  // Avoid unnecessary canvas resets.
  if (
    canvas.width === width &&
    canvas.height === height
  ) {
    return;
  }

  canvas.width = width;
  canvas.height = height;

  updateContext();
  redrawCanvas();
}

// =====================================================
// GET POINTER POINT
// =====================================================

function getPoint(
  event: PointerEvent
): Point {
  if (!canvas) {
    return {
      x: 0,
      y: 0
    };
  }

  const rect =
    canvas.getBoundingClientRect();

  const scaleX =
    canvas.width / rect.width;

  const scaleY =
    canvas.height / rect.height;

  return {
    x:
      (event.clientX - rect.left) *
      scaleX,

    y:
      (event.clientY - rect.top) *
      scaleY
  };
}

// =====================================================
// UPDATE CONTEXT
// =====================================================

function updateContext(): void {
  if (!ctx) {
    return;
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = currentWidth;

  if (isEraser) {
    ctx.globalCompositeOperation =
      "destination-out";

    ctx.strokeStyle =
      "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation =
      "source-over";

    ctx.strokeStyle =
      currentColor;
  }
}

// =====================================================
// CREATE STROKE ID
// =====================================================

function createStrokeId(): string {
  return (
    `stroke-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`
  );
}

// =====================================================
// POINTER DOWN
// =====================================================

function handlePointerDown(
  event: PointerEvent
): void {
  if (!canvas || !ctx) {
    return;
  }

  // Only accept the primary mouse button.
  if (
    event.pointerType === "mouse" &&
    event.button !== 0
  ) {
    return;
  }

  event.preventDefault();

  const point =
    getPoint(event);

  // Send cursor position immediately.
  if (cursorCallback) {
    cursorCallback(
      point.x,
      point.y
    );
  }

  isDrawing = true;

  currentStroke = [point];

  currentStrokeId =
    createStrokeId();

  lastPreviewSentIndex = 0;

  if (previewTimer !== null) {
    window.clearTimeout(
      previewTimer
    );

    previewTimer = null;
  }

  updateContext();

  // Capture the pointer so drawing continues
  // even if the pointer leaves the canvas.
  try {
    canvas.setPointerCapture(
      event.pointerId
    );
  } catch {
    // Some browsers may not support
    // pointer capture.
  }

  // Draw the initial point immediately.
  drawPoint(
    point,
    currentColor,
    currentWidth,
    isEraser
  );

  // Start a new path.
  ctx.beginPath();

  ctx.moveTo(
    point.x,
    point.y
  );
}

// =====================================================
// POINTER MOVE
// =====================================================

function handlePointerMove(
  event: PointerEvent
): void {
  if (!canvas) {
    return;
  }

  const point =
    getPoint(event);

  // Always update cursor position.
  if (cursorCallback) {
    cursorCallback(
      point.x,
      point.y
    );
  }

  // Do not draw unless pointer is down.
  if (
    !isDrawing ||
    !ctx
  ) {
    return;
  }

  event.preventDefault();

  currentStroke.push(point);

  updateContext();

  ctx.beginPath();

  ctx.moveTo(
    currentStroke[
      currentStroke.length - 2
    ]?.x ?? point.x,

    currentStroke[
      currentStroke.length - 2
    ]?.y ?? point.y
  );

  ctx.lineTo(
    point.x,
    point.y
  );

  ctx.stroke();

  // Send a real-time preview batch.
  schedulePreviewSend();
}

// =====================================================
// SCHEDULE PREVIEW SEND
// =====================================================

function schedulePreviewSend(): void {
  if (
    !isDrawing ||
    !currentStrokeId ||
    !drawPreviewCallback
  ) {
    return;
  }

  if (previewTimer !== null) {
    return;
  }

  previewTimer =
    window.setTimeout(
      () => {
        previewTimer = null;

        sendPreviewPoints();
      },
      PREVIEW_INTERVAL
    );
}

// =====================================================
// SEND PREVIEW POINTS
// =====================================================

function sendPreviewPoints(): void {
  if (
    !isDrawing ||
    !currentStrokeId ||
    !drawPreviewCallback
  ) {
    return;
  }

  const newPoints =
    currentStroke.slice(
      lastPreviewSentIndex
    );

  if (newPoints.length === 0) {
    return;
  }

  let previewPoints: Point[];

  // Include the previous point so separate
  // batches connect smoothly.
  if (
    lastPreviewSentIndex > 0
  ) {
    const previousPoint =
      currentStroke[
        lastPreviewSentIndex - 1
      ];

    previewPoints = [
      previousPoint,
      ...newPoints
    ];
  } else {
    previewPoints = [
      ...newPoints
    ];
  }

  lastPreviewSentIndex =
    currentStroke.length;

  drawPreviewCallback(
    currentStrokeId,
    previewPoints,
    currentColor,
    currentWidth,
    isEraser
  );
}

// =====================================================
// FLUSH FINAL PREVIEW
// =====================================================

function flushPreviewSend(): void {
  if (previewTimer !== null) {
    window.clearTimeout(
      previewTimer
    );

    previewTimer = null;
  }

  if (
    !currentStrokeId ||
    !drawPreviewCallback
  ) {
    return;
  }

  const remainingPoints =
    currentStroke.slice(
      lastPreviewSentIndex
    );

  if (remainingPoints.length === 0) {
    return;
  }

  let previewPoints: Point[];

  if (
    lastPreviewSentIndex > 0
  ) {
    const previousPoint =
      currentStroke[
        lastPreviewSentIndex - 1
      ];

    previewPoints = [
      previousPoint,
      ...remainingPoints
    ];
  } else {
    previewPoints = [
      ...remainingPoints
    ];
  }

  lastPreviewSentIndex =
    currentStroke.length;

  drawPreviewCallback(
    currentStrokeId,
    previewPoints,
    currentColor,
    currentWidth,
    isEraser
  );
}

// =====================================================
// POINTER UP
// =====================================================

function handlePointerUp(
  event: PointerEvent
): void {
  if (!isDrawing) {
    return;
  }

  event.preventDefault();

  // Send any remaining preview points first.
  flushPreviewSend();

  const completedStrokeId =
    currentStrokeId;

  // Commit the complete stroke exactly once.
  if (
    currentStroke.length > 0 &&
    drawCallback &&
    completedStrokeId
  ) {
    drawCallback(
      completedStrokeId,
      [...currentStroke],
      currentColor,
      currentWidth,
      isEraser
    );
  }

  isDrawing = false;

  currentStroke = [];

  currentStrokeId = null;

  lastPreviewSentIndex = 0;

  if (previewTimer !== null) {
    window.clearTimeout(
      previewTimer
    );

    previewTimer = null;
  }

  if (ctx) {
    ctx.beginPath();
  }

  if (
    canvas &&
    canvas.hasPointerCapture(
      event.pointerId
    )
  ) {
    try {
      canvas.releasePointerCapture(
        event.pointerId
      );
    } catch {
      // Ignore release errors.
    }
  }
}

// =====================================================
// SET CANVAS STATE
// =====================================================

export function setCanvasState(
  strokes: Stroke[]
): void {
  canvasStrokes =
    strokes.map(
      (stroke) => ({
        ...stroke,
        points: [
          ...stroke.points
        ]
      })
    );

  // Remove only previews that have now
  // become committed strokes.
  if (strokes.length === 0) {
    // Empty authoritative state means
    // the room was globally cleared.
    remotePreviews.clear();
  } else {
    for (
      const stroke of strokes
    ) {
      if (
        stroke.userId &&
        stroke.id
      ) {
        remotePreviews.delete(
          `${stroke.userId}:${stroke.id}`
        );
      }
    }
  }

  redrawCanvas();
}

// =====================================================
// ADD REMOTE STROKE
// =====================================================

export function addRemoteStroke(
  stroke: Stroke
): void {
  // Prevent duplicate committed strokes.
  if (stroke.id) {
    const alreadyExists =
      canvasStrokes.some(
        (existingStroke) =>
          existingStroke.id ===
          stroke.id
      );

    if (alreadyExists) {
      return;
    }
  }

  canvasStrokes.push({
    ...stroke,
    points: [
      ...stroke.points
    ]
  });

  // Remove matching temporary preview.
  if (
    stroke.userId &&
    stroke.id
  ) {
    remotePreviews.delete(
      `${stroke.userId}:${stroke.id}`
    );
  }

  redrawCanvas();
}

// =====================================================
// DRAW REMOTE STROKE
// =====================================================

export function drawRemoteStroke(
  points: Point[],
  color: string,
  width: number,
  eraser = false
): void {
  if (points.length === 0) {
    return;
  }

  const stroke: Stroke = {
    points: [
      ...points
    ],
    color,
    width,
    eraser
  };

  addRemoteStroke(stroke);
}

// =====================================================
// DRAW REMOTE PREVIEW
// =====================================================

export function drawRemotePreview(
  userId: string,
  strokeId: string,
  points: Point[],
  color: string,
  width: number,
  eraser = false
): void {
  if (
    !userId ||
    !strokeId ||
    points.length === 0
  ) {
    return;
  }

  const previewKey =
    `${userId}:${strokeId}`;

  const existing =
    remotePreviews.get(
      previewKey
    );

  if (existing) {
    const lastExistingPoint =
      existing.points[
        existing.points.length - 1
      ];

    const firstNewPoint =
      points[0];

    let pointsToAdd =
      points;

    // The first point of each batch may be
    // the previous batch's final point.
    if (
      lastExistingPoint &&
      firstNewPoint &&
      lastExistingPoint.x ===
        firstNewPoint.x &&
      lastExistingPoint.y ===
        firstNewPoint.y
    ) {
      pointsToAdd =
        points.slice(1);
    }

    existing.points.push(
      ...pointsToAdd
    );

    // Keep the latest drawing settings.
    existing.color = color;
    existing.width = width;
    existing.eraser = eraser;
  } else {
    remotePreviews.set(
      previewKey,
      {
        id: strokeId,
        userId,
        points: [
          ...points
        ],
        color,
        width,
        eraser
      }
    );
  }

  redrawCanvas();
}

// =====================================================
// CLEAR CANVAS
// =====================================================

export function clearCanvas(): void {
  canvasStrokes = [];

  remotePreviews.clear();

  redrawCanvas();
}

// =====================================================
// REDRAW CANVAS
// =====================================================

function redrawCanvas(): void {
  if (!ctx || !canvas) {
    return;
  }

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Draw committed strokes first.
  for (
    const stroke of canvasStrokes
  ) {
    drawStroke(stroke);
  }

  // Draw temporary remote previews on top.
  for (
    const preview of
      remotePreviews.values()
  ) {
    drawStroke(preview);
  }

  updateContext();
}

// =====================================================
// DRAW POINT
// =====================================================

function drawPoint(
  point: Point,
  color: string,
  width: number,
  eraser: boolean
): void {
  if (!ctx) {
    return;
  }

  ctx.save();

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = width;

  if (eraser) {
    ctx.globalCompositeOperation =
      "destination-out";
  } else {
    ctx.globalCompositeOperation =
      "source-over";

    ctx.fillStyle = color;
  }

  ctx.beginPath();

  ctx.arc(
    point.x,
    point.y,
    Math.max(
      1,
      width / 2
    ),
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();
}

// =====================================================
// DRAW SAVED / PREVIEW STROKE
// =====================================================

function drawStroke(
  stroke: Stroke
): void {
  if (
    !ctx ||
    stroke.points.length === 0
  ) {
    return;
  }

  ctx.save();

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth =
    Math.max(
      1,
      stroke.width
    );

  if (stroke.eraser) {
    ctx.globalCompositeOperation =
      "destination-out";
  } else {
    ctx.globalCompositeOperation =
      "source-over";

    ctx.strokeStyle =
      stroke.color;

    ctx.fillStyle =
      stroke.color;
  }

  const first =
    stroke.points[0];

  // ===================================================
  // SINGLE POINT
  // ===================================================

  if (
    stroke.points.length === 1
  ) {
    ctx.beginPath();

    ctx.arc(
      first.x,
      first.y,
      Math.max(
        1,
        stroke.width / 2
      ),
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

    return;
  }

  // ===================================================
  // MULTIPLE POINTS
  // ===================================================

  ctx.beginPath();

  ctx.moveTo(
    first.x,
    first.y
  );

  for (
    let i = 1;
    i < stroke.points.length;
    i++
  ) {
    const point =
      stroke.points[i];

    ctx.lineTo(
      point.x,
      point.y
    );
  }

  ctx.stroke();

  ctx.restore();
}

// =====================================================
// COLOR
// =====================================================

export function setColor(
  color: string
): void {
  currentColor = color;

  isEraser = false;

  updateContext();
}

// =====================================================
// STROKE WIDTH
// =====================================================

export function setStrokeWidth(
  width: number
): void {
  currentWidth =
    Math.max(
      1,
      Number(width) || 1
    );

  updateContext();
}

// =====================================================
// BRUSH
// =====================================================

export function enableBrush(): void {
  isEraser = false;

  updateContext();
}

// =====================================================
// ERASER
// =====================================================

export function enableEraser(): void {
  isEraser = true;

  updateContext();
}