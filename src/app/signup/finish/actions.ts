"use server";
// The finish step's Server Action (slice 1, #8, design decision 3).
//
// Saves the course and terms for the signed-in person, then takes them to
// onboarding (user-auth spec: "Successful sign-up ... they are taken to
// onboarding").

import { redirect } from "next/navigation";

import { completeSignUp } from "@/lib/auth/completeSignUp";
import { getSessionUser } from "@/lib/auth/session";
import { problemsByField, type SignUpField } from "@/lib/auth/signUpForm";

export type FinishFormState = {
  problems: Partial<Record<SignUpField, string>>;
  values: { courseId: string; acceptedTerms: boolean };
};

export async function finishSignUp(
  _previous: FinishFormState,
  formData: FormData,
): Promise<FinishFormState> {
  // Check again who is signed in. Never trust the page that sent the form to
  // have done it: a Server Action can be called directly.
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.suspendedAt !== null) {
    redirect("/signin");
  }

  const values = {
    courseId: String(formData.get("courseId") ?? ""),
    // A ticked checkbox sends "on". An unticked one sends nothing at all.
    acceptedTerms: formData.get("acceptedTerms") === "on",
  };

  const problems = await completeSignUp(sessionUser, values);
  if (problems.length > 0) {
    return { problems: problemsByField(problems), values };
  }

  // Their account now counts as created. redirect() works by throwing, so
  // nothing after it runs.
  redirect("/onboarding");
}
