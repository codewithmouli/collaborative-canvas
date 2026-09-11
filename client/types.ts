// =====================================================
// COLLABORATIVE CANVAS TYPES
// =====================================================

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  eraser: boolean;
}

export interface CanvasState {
  strokes: Stroke[];
}

export interface RoomInfo {
  roomId: string;
  userCount: number;
}

export interface ConnectionInfo {
  connected: boolean;
  latency: number;
}