// How far a dot may be pulled away from the rest of the graph (slice 4, #11,
// task 8.1).
//
// WHY THIS EXISTS: a dot that is pulled out stays where it is let go, so
// people can tease a tangle of lines apart. Without a limit, one flick could
// leave a dot thousands of pixels away, where it can't be found again.
//
// This file is plain arithmetic with no library or browser code in it, so it
// can be unit tested without a canvas.

export type Point = { x: number; y: number };

// A circle: where its middle is, and how far its edge is from the middle.
export type Circle = { centreX: number; centreY: number; radius: number };

// Works out the circle that just holds a settled graph: its middle is the
// average position of all the dots, and its radius is the distance to the
// dot farthest from that middle.
//
// Why the average and not the middle of the canvas: the graph is not always
// centred on the canvas (the person may have panned), but the dots' own
// positions don't depend on the view.
export function findSettledCircle(points: Point[]): Circle {
  // An empty graph has no middle. Return a harmless circle at 0,0 rather than
  // dividing by zero and producing NaN ("not a number") values.
  if (points.length === 0) {
    return { centreX: 0, centreY: 0, radius: 0 };
  }

  let totalX = 0;
  let totalY = 0;
  for (const point of points) {
    totalX += point.x;
    totalY += point.y;
  }
  const centreX = totalX / points.length;
  const centreY = totalY / points.length;

  let radius = 0;
  for (const point of points) {
    const distance = Math.hypot(point.x - centreX, point.y - centreY);
    if (distance > radius) radius = distance;
  }

  return { centreX, centreY, radius };
}

// Returns the given point if it is inside the allowed area, or the nearest
// point on the edge of the allowed area if it is outside.
//
// The allowed area is the settled circle made `limitMultiplier` times
// bigger, e.g. 2 means "up to twice as far from the middle as the farthest
// dot was when the graph settled".
export function limitToCircle(point: Point, circle: Circle, limitMultiplier: number): Point {
  const allowedDistance = circle.radius * limitMultiplier;

  const offsetX = point.x - circle.centreX;
  const offsetY = point.y - circle.centreY;
  const distance = Math.hypot(offsetX, offsetY);

  // Inside the area (or right on its edge): leave it alone. The second part
  // also covers distance 0, where there is no direction to scale along.
  if (distance <= allowedDistance || distance === 0) {
    return point;
  }

  // Outside: keep the same direction from the middle, but shorten the
  // distance to the edge. Scaling both offsets by the same factor does that.
  const scale = allowedDistance / distance;
  return {
    x: circle.centreX + offsetX * scale,
    y: circle.centreY + offsetY * scale,
  };
}
