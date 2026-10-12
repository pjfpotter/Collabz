// Tests for the drag limit (slice 4, #11, task 8.1): the circle round the
// settled graph, and keeping a pulled dot inside a bigger one.

import { describe, expect, it } from "vitest";

import { findSettledCircle, limitToCircle } from "@/lib/cohort/dragLimit";

describe("findSettledCircle", () => {
  it("puts the middle at the average position and the radius at the farthest dot", () => {
    // Four dots in a square round 10,10, each 5 across and 5 up from it.
    const circle = findSettledCircle([
      { x: 5, y: 5 },
      { x: 15, y: 5 },
      { x: 5, y: 15 },
      { x: 15, y: 15 },
    ]);

    expect(circle.centreX).toBe(10);
    expect(circle.centreY).toBe(10);
    // Each corner is a 5-5-hypotenuse (about 7.07) from the middle.
    expect(circle.radius).toBeCloseTo(Math.hypot(5, 5));
  });

  it("gives a harmless circle, not NaN, when there are no dots", () => {
    expect(findSettledCircle([])).toEqual({ centreX: 0, centreY: 0, radius: 0 });
  });
});

describe("limitToCircle", () => {
  // A circle in the middle of the page with a radius of 100.
  const circle = { centreX: 0, centreY: 0, radius: 100 };

  it("leaves a point inside the allowed area alone", () => {
    const point = { x: 150, y: 0 }; // allowed distance is 100 x 2 = 200
    expect(limitToCircle(point, circle, 2)).toEqual(point);
  });

  it("leaves a point exactly on the edge alone", () => {
    const point = { x: 200, y: 0 };
    expect(limitToCircle(point, circle, 2)).toEqual(point);
  });

  it("brings a point outside back to the edge, in the same direction", () => {
    // 3000 across and 4000 up is 5000 from the middle, along a 3-4-5 line.
    const result = limitToCircle({ x: 3000, y: 4000 }, circle, 2);

    // The edge is 200 away along that same line: 120 across and 160 up.
    expect(result.x).toBeCloseTo(120);
    expect(result.y).toBeCloseTo(160);
  });

  it("works from a circle that isn't at the origin", () => {
    const offsetCircle = { centreX: 50, centreY: -20, radius: 10 };
    // 1000 straight to the right of the middle, so the edge is 20 to the right.
    const result = limitToCircle({ x: 1050, y: -20 }, offsetCircle, 2);

    expect(result.x).toBeCloseTo(70);
    expect(result.y).toBeCloseTo(-20);
  });

  it("copes with a point exactly at the middle of a zero-size circle", () => {
    const empty = { centreX: 0, centreY: 0, radius: 0 };
    expect(limitToCircle({ x: 0, y: 0 }, empty, 2)).toEqual({ x: 0, y: 0 });
  });
});
