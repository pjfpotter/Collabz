// /signup/finish - the last step of signing up (slice 1, #8, design
// decision 3).
//
// The magic link from /signup lands here, carrying the person's answers in
// the address: /signup/finish?course=business&terms=accepted. Because the
// answers travel in the link, this works whichever browser opens it.
//
// - With good answers in the address: they're shown already filled in, and
//   one tap on "Finish sign-up" saves them.
// - Without (e.g. someone used /signin with an email that has no account
//   yet, or edited the link): the course list and an unticked box, to fill in.
//
// Until this is done, the account counts as not created (user-auth spec:
// "An unfinished account can't use the app").

import { redirect } from "next/navigation";

import { isAccountFinished } from "@/lib/auth/accountState";
import { getActiveCourses } from "@/lib/auth/courses";
import { getSessionUser } from "@/lib/auth/session";

import { FinishForm } from "./FinishForm";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Finish signing up · Collabz",
};

export default async function FinishSignUpPage({
  searchParams,
}: PageProps<"/signup/finish">) {
  const sessionUser = await getSessionUser();

  // Only someone who has opened a magic link can finish. Suspended people
  // go to /signin, which explains why they can't continue.
  if (!sessionUser || sessionUser.suspendedAt !== null) {
    redirect("/signin");
  }
  // Already finished (e.g. an existing member who used /signup again).
  if (isAccountFinished(sessionUser)) {
    redirect("/");
  }

  const courses = await getActiveCourses();
  const { course, terms } = await searchParams;

  // Only trust the address's course if it is a real, active course. Anything
  // else (a retired course, an edited link) means "choose again".
  const linkCourseIsValid =
    typeof course === "string" && courses.some((choice) => choice.id === course);
  const courseId = linkCourseIsValid ? course : "";
  const acceptedTerms = terms === "accepted";

  const answersCameWithTheLink = linkCourseIsValid && acceptedTerms;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-3xl font-semibold">Finish signing up</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {answersCameWithTheLink
          ? "Nearly there. Check your answers and finish signing up."
          : "Before you start, choose your course and accept the terms."}
      </p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Signing up as <strong>{sessionUser.email}</strong>
      </p>

      <FinishForm courses={courses} courseId={courseId} acceptedTerms={acceptedTerms} />
    </main>
  );
}
