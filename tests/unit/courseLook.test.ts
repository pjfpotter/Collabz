// Tests for the course look (slice 10, #45, task 2.3).
//
// The visual-design spec says a course is never shown by colour alone, so
// the two real courses must always differ in SHAPE, not only in colour.

import { describe, expect, it } from "vitest";

import { courseLook } from "@/lib/course/courseLook";

describe("courseLook", () => {
  it("draws Software as a circle in the software colour", () => {
    const look = courseLook("software");
    expect(look.shape).toBe("circle");
    expect(look.fill).toBe("var(--software)");
  });

  it("draws Business as a rounded square, with darker orange for its words", () => {
    const look = courseLook("business");
    expect(look.shape).toBe("square");
    expect(look.fill).toBe("var(--business)");
    // Orange fills are too light to read as text on paper, so the words use
    // the darker business-text colour.
    expect(look.text).toBe("var(--business-text)");
  });

  it("gives the two courses different shapes, so colour is never the only cue", () => {
    expect(courseLook("software").shape).not.toBe(courseLook("business").shape);
  });

  it("gives any other course, or no course, the grey circle", () => {
    expect(courseLook("design")).toEqual(courseLook(null));
    expect(courseLook("design").shape).toBe("circle");
    expect(courseLook("design").fill).toBe("var(--muted)");
  });
});
