// =====================================================
// POINT
// =====================================================

export interface Point {
  x: number;
  y: number;
}

// =====================================================
// STROKE
// =====================================================

export interface Stroke {
  id?: string;

  userId?: string;

  points: Point[];

  color: string;

  width: number;

  eraser: boolean;
}