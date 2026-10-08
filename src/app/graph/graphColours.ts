// Which colour each course's dot gets (slice 4, #11, design decision 4).
//
// The colours themselves are in graphColours.module.css. This file only says
// WHICH of those named colours belongs to which course, and is shared by the
// legend (page.tsx) and the drawing (CohortGraph.tsx) so they agree.
//
// It has no imports, so both server and browser code can use it.

// From a course's id to the name of its colour in graphColours.module.css.
const COURSE_COLOUR_NAMES: Record<string, string> = {
  software: "--graph-software",
  business: "--graph-business",
};

// The colour for a course that isn't in the list above: one an admin adds
// later, or a person with no course. They all share one grey for now. (Giving
// a new course its own colour is a one-line change here plus one in the CSS.)
const OTHER_COURSE_COLOUR_NAME = "--graph-other-course";

// Returns the NAME of the colour for a course, e.g. "--graph-software".
export function courseColourName(courseId: string | null): string {
  if (courseId === null) {
    return OTHER_COURSE_COLOUR_NAME;
  }
  return COURSE_COLOUR_NAMES[courseId] ?? OTHER_COURSE_COLOUR_NAME;
}
