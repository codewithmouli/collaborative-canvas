import type {
  Point,
  Stroke
} from "./types";

interface RoomDrawingState {
  strokes: Stroke[];
  redo: Stroke[];
}

const drawingStates =
  new Map<
    string,
    RoomDrawingState
  >();

function getState(
  roomId: string
): RoomDrawingState {

  let state =
    drawingStates.get(roomId);

  if (!state) {

    state = {
      strokes: [],
      redo: []
    };

    drawingStates.set(
      roomId,
      state
    );
  }

  return state;
}

export function addStroke(
  roomId: string,
  userId: string,
  points: Point[],
  color: string,
  width: number,
  eraser: boolean
): Stroke {

  const state =
    getState(roomId);

  const stroke: Stroke = {
    id:
      `stroke-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`,

    userId,

    points: points.map(
      (point) => ({
        x: point.x,
        y: point.y
      })
    ),

    color,
    width,
    eraser
  };

  state.strokes.push(
    stroke
  );

  state.redo = [];

  return stroke;
}

export function undo(
  roomId: string
): Stroke | null {

  const state =
    getState(roomId);

  const stroke =
    state.strokes.pop();

  if (!stroke) {
    return null;
  }

  state.redo.push(
    stroke
  );

  return stroke;
}

export function redo(
  roomId: string
): Stroke | null {

  const state =
    getState(roomId);

  const stroke =
    state.redo.pop();

  if (!stroke) {
    return null;
  }

  state.strokes.push(
    stroke
  );

  return stroke;
}

export function clear(
  roomId: string
): void {

  const state =
    getState(roomId);

  state.redo.push(
    ...state.strokes
  );

  state.strokes = [];
}

export function getStrokes(
  roomId: string
): Stroke[] {

  return [
    ...getState(roomId).strokes
  ];
}