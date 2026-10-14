// The last step of sign-up: save the person's course and their acceptance
// of the terms (slice 1, #8, design decision 3).
//
// Until this runs, their account counts as NOT created (user-auth spec: "An
// unfinished account can't use the app"). The /signup/finish page calls it.
//
// The answers arrive inside the magic link the person opened, and anyone can
// edit a link before opening it, so we check them again here with the same
// rules as the sign-up form. Only then do we save.
//
// A plain function rather than code inside the page, so the integration
// tests can call it directly.
//
// Owner: slice 1 (#8).

import { prisma } from "@/lib/db";

import { getActiveCourses } from "./courses";
import { checkSignUpForm, type SignUpProblem } from "./signUpForm";

export async function completeSignUp(
  // The signed-in person. Their email is already known (from the magic
  // link), so it isn't something they can change here.
  user: { id: string; email: string },
  answers: { courseId: string; acceptedTerms: boolean },
): Promise<SignUpProblem[]> {
  const activeCourseIds = (await getActiveCourses()).map((course) => course.id);

  const problems = checkSignUpForm({ email: user.email, ...answers }, activeCourseIds);
  if (problems.length > 0) {
    // Nothing is saved, so the account stays unfinished.
    return problems;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      courseId: answers.courseId,
      // When they accepted. One version of the terms for the live test, so a
      // date is enough (design decision 10).
      acceptedTermsAt: new Date(),
    },
  });

  return [];
}
