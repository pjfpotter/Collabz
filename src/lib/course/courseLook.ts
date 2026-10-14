// How each course LOOKS: its shape and its colours (slice 10, #45, design
// decision 4; visual-design spec "Course is never shown by colour alone").
//
// The rule from the design: a course is always shown by a colour AND a shape
// AND its name together, so someone who can't tell the colours apart can
// still tell the courses apart. Software is a circle, Business is a rounded
// square.
//
// This file only DECIDES the look. It draws nothing and imports nothing, so
// the badge (CourseMark.tsx) and, later, the graph can both use it and can't
// disagree. The colours are NAMES of CSS variables from globals.css (never
// hex values), so they follow the light and dark theme by themselves.

export type CourseShape = "circle" | "square";

export type CourseLook = {
  shape: CourseShape;
  // The shape's fill: the course colour used for shapes.
  fill: string;
  // The colour of the course's WORDS and the badge border. Can differ from
  // the fill because some fills aren't dark enough to read as text on paper
  // (orange is the one).
  text: string;
};

// The two courses the app is built around, by their course id (the same ids
// the graph's colour list uses).
const SOFTWARE: CourseLook = {
  shape: "circle",
  fill: "var(--software)",
  text: "var(--software)",
};

const BUSINESS: CourseLook = {
  shape: "square",
  fill: "var(--business)",
  text: "var(--business-text)",
};

// A course an admin adds later, or a person with no course: a plain grey
// circle with the course's name beside it. (The same fallback the graph has
// had since slice 4. Giving a new course its own look is one line here.)
const OTHER: CourseLook = {
  shape: "circle",
  fill: "var(--muted)",
  text: "var(--muted)",
};

export function courseLook(courseId: string | null): CourseLook {
  if (courseId === "software") return SOFTWARE;
  if (courseId === "business") return BUSINESS;
  return OTHER;
}
