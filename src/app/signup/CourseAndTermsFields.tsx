// The course list and the terms tick box (slice 1, #8).
//
// Used by BOTH the sign-up form (/signup) and the finish step
// (/signup/finish), so the two always ask the same thing in the same words.
//
// No "use client" at the top: it has no state of its own, so it works inside
// either kind of component.

import Link from "next/link";

import type { CourseChoice } from "@/lib/auth/courses";

type CourseAndTermsFieldsProps = {
  courses: CourseChoice[];
  // What to show already chosen (e.g. from the magic link, or what they
  // picked before a problem was found).
  courseId: string;
  acceptedTerms: boolean;
  // A message to show under each field, if something needs fixing.
  courseProblem?: string;
  termsProblem?: string;
};

export function CourseAndTermsFields({
  courses,
  courseId,
  acceptedTerms,
  courseProblem,
  termsProblem,
}: CourseAndTermsFieldsProps) {
  return (
    <>
      <label htmlFor="courseId" className="font-semibold">
        Your course
      </label>
      <select
        id="courseId"
        name="courseId"
        required
        defaultValue={courseId}
        aria-describedby={courseProblem ? "course-problem" : undefined}
        className="rounded border border-current/40 bg-transparent px-3 py-2"
      >
        {/* An empty first choice, so nobody ends up on a course by accident
            just because it was first in the list. */}
        <option value="">Choose your course…</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.name}
          </option>
        ))}
      </select>
      {courseProblem && (
        <p id="course-problem" role="alert" className="text-sm text-red-700 dark:text-red-400">
          {courseProblem}
        </p>
      )}

      {/* One tick box covers both documents, as the brief asks for "a T&C
          and a data policy" accepted together at sign-up. */}
      <div className="mt-2 flex items-start gap-3">
        <input
          id="acceptedTerms"
          name="acceptedTerms"
          type="checkbox"
          required
          defaultChecked={acceptedTerms}
          aria-describedby={termsProblem ? "terms-problem" : undefined}
          // A bigger box is easier to tap on a phone.
          className="mt-1 h-5 w-5 shrink-0"
        />
        <label htmlFor="acceptedTerms">
          I accept the{" "}
          {/* target="_blank" opens them in a new tab, so reading them doesn't
              lose what you've filled in. */}
          <Link href="/terms" target="_blank" className="underline underline-offset-4">
            Terms &amp; Conditions
          </Link>{" "}
          and the{" "}
          <Link href="/privacy" target="_blank" className="underline underline-offset-4">
            data policy
          </Link>
          .
        </label>
      </div>
      {termsProblem && (
        <p id="terms-problem" role="alert" className="text-sm text-red-700 dark:text-red-400">
          {termsProblem}
        </p>
      )}
    </>
  );
}
