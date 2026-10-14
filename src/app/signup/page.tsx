// /signup - create an account with a magic link (slice 1, #8).
//
// Where the QR code points. One form: email, course and the terms tick box
// (user-auth spec: "Sign-up records the user's course"). Nothing is sent
// until all three are filled in. The link it emails finishes sign-up at
// /signup/finish.
//
// A Server Component: it loads the course list, and sends anyone already
// signed in somewhere more useful.

import Link from "next/link";
import { redirect } from "next/navigation";

import { isAccountFinished } from "@/lib/auth/accountState";
import { getActiveCourses } from "@/lib/auth/courses";
import { getSessionUser } from "@/lib/auth/session";

import { SignUpForm } from "./SignUpForm";
import { textLinkClasses } from "@/components/formStyles";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Sign up · Collabz",
};

export default async function SignUpPage() {
  // Someone who has really signed in doesn't need to sign up again.
  // (A suspended person is left alone here; /signin explains their case.)
  const sessionUser = await getSessionUser();
  if (sessionUser && sessionUser.suspendedAt === null) {
    redirect(isAccountFinished(sessionUser) ? "/" : "/signup/finish");
  }

  const courses = await getActiveCourses();

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-4xl">Sign up</h1>
      <p className="mt-2 text-muted">
        Tell us your email and course, and we&apos;ll send you a link to finish
        signing up. No password needed.
      </p>

      <SignUpForm courses={courses} />

      <p className="mt-8 text-sm">
        Already signed up?{" "}
        <Link href="/signin" className={textLinkClasses}>
          Sign in
        </Link>
      </p>
    </main>
  );
}
