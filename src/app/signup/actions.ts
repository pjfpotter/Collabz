"use server";
// The sign-up form's Server Action (slice 1, #8, design decision 3).
//
// Checks the answers, then emails a magic link. The person's course and
// terms travel INSIDE the link (in the address it returns to), so sign-up
// still finishes when the link opens in a different browser, e.g. Gmail's
// own browser on a phone. Nothing is saved to the database here.

import { getActiveCourses } from "@/lib/auth/courses";
import { sendMagicLink } from "@/lib/auth/magicLink";
import { checkSignUpForm, problemsByField, type SignUpField } from "@/lib/auth/signUpForm";

// What the form shows after each try. SignUpForm.tsx reads it.
export type SignUpFormState =
  | { step: "ready" }
  | {
      step: "problem";
      problems: Partial<Record<SignUpField, string>>;
      // What they filled in, so they only fix what's wrong.
      values: { email: string; courseId: string; acceptedTerms: boolean };
    }
  | { step: "sent"; email: string };

// Where the magic link returns to, carrying the answers, e.g.
// /signup/finish?course=business&terms=accepted
// (Not exported: a "use server" file may only export async functions, as
// each export becomes something the browser can call.)
function finishAddress(courseId: string): string {
  const query = new URLSearchParams({ course: courseId, terms: "accepted" });
  return `/signup/finish?${query}`;
}

// useActionState passes the previous state first, then the form's fields.
export async function requestSignUpLink(
  _previous: SignUpFormState,
  formData: FormData,
): Promise<SignUpFormState> {
  const values = {
    email: String(formData.get("email") ?? ""),
    courseId: String(formData.get("courseId") ?? ""),
    // A ticked checkbox sends "on". An unticked one sends nothing at all.
    acceptedTerms: formData.get("acceptedTerms") === "on",
  };

  const activeCourseIds = (await getActiveCourses()).map((course) => course.id);
  const problems = checkSignUpForm(values, activeCourseIds);
  if (problems.length > 0) {
    // No link is sent and no account is created (spec: "Course not chosen",
    // "Terms not accepted").
    return { step: "problem", problems: problemsByField(problems), values };
  }

  const result = await sendMagicLink(values.email, finishAddress(values.courseId));
  if (result === "failed") {
    return {
      step: "problem",
      problems: { email: "We couldn't send the email just now. Please try again in a minute." },
      values,
    };
  }

  return { step: "sent", email: values.email.trim() };
}
