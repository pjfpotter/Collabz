"use client";
// The form on /signup/finish: the course and terms, usually already filled
// in from the magic link, and one button (slice 1, #8).
//
// Why a button at all, rather than saving as soon as the page opens: opening
// a page shouldn't change anything (browsers load pages ahead of time), and
// accepting the terms should be something the person actually does
// (design decision 3).

import { useActionState } from "react";

import type { CourseChoice } from "@/lib/auth/courses";

import { CourseAndTermsFields } from "../CourseAndTermsFields";
import { finishSignUp, type FinishFormState } from "./actions";

type FinishFormProps = {
  courses: CourseChoice[];
  // What the magic link carried, if it was valid.
  courseId: string;
  acceptedTerms: boolean;
};

export function FinishForm({ courses, courseId, acceptedTerms }: FinishFormProps) {
  const startingState: FinishFormState = {
    problems: {},
    values: { courseId, acceptedTerms },
  };
  const [state, formAction, pending] = useActionState(finishSignUp, startingState);

  return (
    // The key makes the fields start again from what was sent, after a
    // problem (see SignUpForm.tsx).
    <form
      key={JSON.stringify(state.values)}
      action={formAction}
      className="mt-6 flex flex-col gap-3"
    >
      <CourseAndTermsFields
        courses={courses}
        courseId={state.values.courseId}
        acceptedTerms={state.values.acceptedTerms}
        courseProblem={state.problems.courseId}
        termsProblem={state.problems.acceptedTerms}
      />

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded border border-current px-4 py-2 font-semibold disabled:opacity-50"
      >
        {pending ? "Saving…" : "Finish sign-up"}
      </button>
    </form>
  );
}
