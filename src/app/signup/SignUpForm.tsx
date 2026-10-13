"use client";
// The sign-up form on /signup: email, course and the terms tick box
// (slice 1, #8).
//
// A Client Component only so it can show what happened after you press the
// button without a page reload (React's useActionState). The checks and the
// email happen on the server, in actions.ts.

import { useActionState } from "react";

import type { CourseChoice } from "@/lib/auth/courses";

import { requestSignUpLink, type SignUpFormState } from "./actions";
import { CourseAndTermsFields } from "./CourseAndTermsFields";

const startingState: SignUpFormState = { step: "ready" };

export function SignUpForm({ courses }: { courses: CourseChoice[] }) {
  const [state, formAction, pending] = useActionState(requestSignUpLink, startingState);

  if (state.step === "sent") {
    return (
      <div className="mt-6 rounded border border-current/20 p-4" role="status" data-testid="check-email">
        <p className="font-semibold">Check your email</p>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          We sent a link to <strong>{state.email}</strong>. Open it to finish
          signing up. It works once and expires in 24 hours. If it isn&apos;t
          there, check your spam folder.
        </p>
      </div>
    );
  }

  // Before the first try there's nothing to keep or report.
  const values =
    state.step === "problem" ? state.values : { email: "", courseId: "", acceptedTerms: false };
  const problems = state.step === "problem" ? state.problems : {};

  return (
    // key: React keeps a form's fields as they were unless told otherwise.
    // Changing the key after each try makes it start from `values`, which
    // hold exactly what the person sent.
    <form
      key={JSON.stringify(values)}
      action={formAction}
      className="mt-6 flex flex-col gap-3"
    >
      <label htmlFor="email" className="font-semibold">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={values.email}
        aria-describedby={problems.email ? "email-problem" : undefined}
        className="rounded border border-current/40 bg-transparent px-3 py-2"
      />
      {problems.email && (
        <p id="email-problem" role="alert" className="text-sm text-red-700 dark:text-red-400">
          {problems.email}
        </p>
      )}

      <CourseAndTermsFields
        courses={courses}
        courseId={values.courseId}
        acceptedTerms={values.acceptedTerms}
        courseProblem={problems.courseId}
        termsProblem={problems.acceptedTerms}
      />

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded border border-current px-4 py-2 font-semibold disabled:opacity-50"
      >
        {pending ? "Sending…" : "Sign up"}
      </button>
    </form>
  );
}
