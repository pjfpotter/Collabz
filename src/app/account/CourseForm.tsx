"use client";
// "Your course" on /account: a list and a Save button (slice 7, #14).
//
// A Client Component only so it can say "Saved" or what went wrong without
// a page reload (React's useActionState). The rule is on the server, in
// src/lib/account/course.ts.

import { useActionState } from "react";

import { saveCourse, type CourseFormState } from "./actions";

type CourseFormProps = {
  // The courses on offer now.
  activeCourses: { id: string; name: string }[];
  // Their current course. It may have been retired since they chose it: it
  // is still shown as theirs, but can't be chosen again once changed
  // (account-management spec: "Only active courses offered").
  current: { id: string; name: string; retired: boolean } | null;
};

const startingState: CourseFormState = { step: "ready" };

// A small downward chevron, drawn as an SVG picture inside a CSS
// background, for the course dropdown (see its className).
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 7.5l5 5 5-5'/%3E%3C/svg%3E\")";

export function CourseForm({ activeCourses, current }: CourseFormProps) {
  const [state, formAction, pending] = useActionState(saveCourse, startingState);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
      <label htmlFor="courseId" className="sr-only">
        Your course
      </label>
      <select
        id="courseId"
        name="courseId"
        defaultValue={current?.id ?? ""}
        // Browsers draw the dropdown arrow themselves and mostly ignore
        // padding around it, which left it squashed against the border.
        // So: hide theirs (appearance-none) and draw our own chevron as a
        // background picture, 0.75rem in from the right, with pr-10 keeping
        // the course name clear of it. A mid-grey chevron reads on both
        // light and dark backgrounds.
        className="appearance-none rounded border border-current/40 bg-transparent bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat py-2 pr-10 pl-3"
        style={{ backgroundImage: CHEVRON }}
      >
        {!current && <option value="">Choose your course…</option>}
        {/* Their retired course, shown so the list doesn't pretend they're
            on something else. Choosing it again is refused on the server. */}
        {current?.retired && (
          <option value={current.id} disabled>
            {current.name} (no longer offered)
          </option>
        )}
        {activeCourses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-current px-4 py-2 font-semibold disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save course"}
      </button>

      {/* role="status" and role="alert" make a screen reader read the answer
          out when it appears. */}
      {state.step === "saved" && (
        <p role="status" className="w-full text-sm" data-testid="course-saved">
          Course saved.
        </p>
      )}
      {state.step === "problem" && (
        <p role="alert" className="w-full text-sm text-red-700 dark:text-red-400">
          {state.message}
        </p>
      )}
    </form>
  );
}
