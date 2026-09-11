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
// DRAW CALLBACK
// =====================================================

type DrawCallback = (
  points: Point[],
  color: string,
  width: number,
  eraser: boolean
) => void;

let drawCallback: DrawCallback | null = null;

// =====================================================
// CURSOR CALLBACK
// =====================================================

type CursorCallback = (
  x: number,
  y: number
) => void;

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

  const context =
    canvas.getContext("2d");

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

  // Remove duplicate listeners if setupCanvas
  // is accidentally called more than once.

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

  const width =
    Math.max(
      1,
      Math.round(rect.width)
    );

  const height =
    Math.max(
      1,
      Math.round(rect.height)
    );

  // Save existing drawing
  // before resizing.

  const oldStrokes = [
    ...canvasStrokes
  ];

  canvas.width = width;

  canvas.height = height;

  canvasStrokes = oldStrokes;

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

  ctx.lineWidth =
    currentWidth;

  if (isEraser) {

    ctx.globalCompositeOperation =
      "destination-out";

  } else {

    ctx.globalCompositeOperation =
      "source-over";

    ctx.strokeStyle =
      currentColor;
  }
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

  // Only use the primary mouse button.

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

  currentStroke = [];

  currentStroke.push(point);

  updateContext();

  // Keep receiving pointer events
  // while the mouse button is held.

  try {

    canvas.setPointerCapture(
      event.pointerId
    );

  } catch {
    // Ignore browsers that do not
    // support pointer capture.
  }

  // Draw starting dot.

  ctx.beginPath();

  ctx.arc(
    point.x,
    point.y,
    Math.max(
      1,
      currentWidth / 2
    ),
    0,
    Math.PI * 2
  );

  if (isEraser) {

    ctx.globalCompositeOperation =
      "destination-out";

  } else {

    ctx.globalCompositeOperation =
      "source-over";

    ctx.fillStyle =
      currentColor;
  }

  ctx.fill();

  // Start line from this point.

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

  // ===================================================
  // SEND CURSOR POSITION
  // ===================================================

  if (cursorCallback) {
    cursorCallback(
      point.x,
      point.y
    );
  }

  // ===================================================
  // DRAW ONLY WHEN MOUSE IS DOWN
  // ===================================================

  if (
    !isDrawing ||
    !ctx
  ) {
    return;
  }

  event.preventDefault();

  currentStroke.push(point);

  updateContext();

  ctx.lineTo(
    point.x,
    point.y
  );

  ctx.stroke();

  ctx.beginPath();

  ctx.moveTo(
    point.x,
    point.y
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

  isDrawing = false;

  // Finish current stroke.

  if (
    currentStroke.length > 0 &&
    drawCallback
  ) {

    drawCallback(
      [...currentStroke],
      currentColor,
      currentWidth,
      isEraser
    );
  }

  currentStroke = [];

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

  redrawCanvas();

  console.log(
    "Canvas state:",
    canvasStrokes.length,
    "strokes"
  );
}

// =====================================================
// ADD REMOTE STROKE
// =====================================================

export function addRemoteStroke(
  stroke: Stroke
): void {

  canvasStrokes.push({
    ...stroke,

    points: [
      ...stroke.points
    ]
  });

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
// CLEAR CANVAS
// =====================================================

export function clearCanvas(): void {

  canvasStrokes = [];

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

  for (
    const stroke of canvasStrokes
  ) {

    drawStroke(stroke);
  }

  updateContext();
}

// =====================================================
// DRAW SAVED STROKE
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
    stroke.width;

  if (stroke.eraser) {

    ctx.globalCompositeOperation =
      "destination-out";

  } else {

    ctx.globalCompositeOperation =
      "source-over";

    ctx.strokeStyle =
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

    if (!stroke.eraser) {

      ctx.fillStyle =
        stroke.color;
    }

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
      width
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