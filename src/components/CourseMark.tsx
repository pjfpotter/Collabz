// A course shown as a coloured shape plus its name (slice 10, #45, design
// decision 4). It is used wherever a person's course appears, so the rule
// "never colour alone" is kept in one place: this component always draws the
// shape and always writes the name.
//
//   <CourseMark courseId="software" name="Software" />
//
// - variant "badge" (the default) is the pill from the design: a border in
//   the course colour, the shape, and the name in bold.
// - variant "plain" is just the shape and the name, with no pill, for tight
//   spaces such as a line of small print or a legend.
//
// The look itself (which shape, which colour) comes from courseLook.ts.

import { courseLook } from "@/lib/course/courseLook";

type CourseMarkProps = {
  // The course's id, e.g. "software". null for a person with no course.
  courseId: string | null;
  // The name to write beside the shape, e.g. "Software".
  name: string;
  variant?: "badge" | "plain";
};

export function CourseMark({ courseId, name, variant = "badge" }: CourseMarkProps) {
  const look = courseLook(courseId);

  // 12 x 12 box. A circle with a 5px radius, or a square with rounded
  // corners, both centred.
  const shape = (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
      {look.shape === "circle" ? (
        <circle cx="6" cy="6" r="5" fill={look.fill} />
      ) : (
        <rect x="1" y="1" width="10" height="10" rx="2.5" fill={look.fill} />
      )}
    </svg>
  );

  if (variant === "plain") {
    return (
      <span
        className="inline-flex items-center gap-2 text-sm font-semibold"
        style={{ color: look.text }}
        // A data attribute so a test can tell which shape was drawn.
        data-course-shape={look.shape}
      >
        {shape}
        {name}
      </span>
    );
  }

  return (
    <span
      // h-8 and px-3.5 are the design's badge size. rounded-full makes the
      // pill. The 1.5px border is written as an arbitrary value because
      // Tailwind has no 1.5px border step.
      className="inline-flex h-8 items-center gap-2 rounded-full border-[1.5px] px-3.5 text-sm font-bold"
      style={{ color: look.text, borderColor: look.text }}
      data-course-shape={look.shape}
    >
      {shape}
      {name}
    </span>
  );
}
