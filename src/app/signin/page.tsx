// /signin - sign in to an existing account with a magic link (slice 1, #8).
//
// A Server Component. Before showing the form, it works out whether the
// visitor should be somewhere else, because every magic link (sign-in AND a
// new email's first sign-in) comes back here once opened:
//   - a finished account                 -> home
//   - an account with no course or terms -> /signup/finish to complete it
//     (user-auth spec: "An unfinished account can't use the app")
//   - a suspended account                -> the "suspended" message
// Auth.js also sends people here when a link fails, with ?error=... in the
// address (see `pages` in src/auth.ts), and we explain what went wrong.

import Link from "next/link";
import { redirect } from "next/navigation";

import { isAccountFinished } from "@/lib/auth/accountState";
import { getSessionUser } from "@/lib/auth/session";

import { SignInForm } from "./SignInForm";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Sign in · Collabz",
};

// PageProps is a helper type Next.js generates for each route. In this
// version of Next.js `searchParams` (the ?error=... part of the address) is
// a Promise, so it has to be awaited.
export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  // The real, unfiltered magic-link user (not the dev switcher's pretend
  // user, which this page ignores).
  const sessionUser = await getSessionUser();

  const isSuspended = sessionUser !== null && sessionUser.suspendedAt !== null;

  // redirect() works by throwing, so nothing after it runs.
  if (sessionUser && !isSuspended) {
    if (isAccountFinished(sessionUser)) {
      redirect("/");
    }
    redirect("/signup/finish");
  }

  const { error } = await searchParams;
  // Someone suspended while already signed in has a session but may not use
  // it; someone refused at sign-in arrives with ?error=AccessDenied. Both get
  // the same message.
  const message = isSuspended ? SUSPENDED_MESSAGE : messageForError(error);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Enter the email you signed up with and we&apos;ll send you a link. No
        password needed.
      </p>

      {message && (
        <p
          className="mt-6 rounded border border-current/20 p-4"
          role="alert"
          data-testid="signin-message"
        >
          {message}
        </p>
      )}

      {/* A suspended person can't do anything with a new link, so we don't
          offer the form. */}
      {!isSuspended && <SignInForm />}

      <p className="mt-8 text-sm">
        New here?{" "}
        <Link href="/signup" className="underline underline-offset-4">
          Sign up
        </Link>
      </p>
    </main>
  );
}

const SUSPENDED_MESSAGE =
  "This account is suspended, so it can't sign in. If you think this is a mistake, contact the Collabz admins.";

// Turns Auth.js's error code into a sentence for the person.
// The codes come from Auth.js (https://authjs.dev/reference/core/errors).
//
// Why only these two get their own words: with our set-up, "AccessDenied"
// only ever means our signIn callback refused a suspended account, and
// "Verification" means the link was already used or has expired (user-auth
// spec: "Magic links are single-use and expire"). Anything else is a fault on
// our side, and the useful advice is the same: try again.
function messageForError(error: string | string[] | undefined): string | null {
  if (error === undefined) {
    return null;
  }
  if (error === "AccessDenied") {
    return SUSPENDED_MESSAGE;
  }
  if (error === "Verification") {
    return "That sign-in link has already been used or has expired. Enter your email below to get a new one.";
  }
  return "Something went wrong signing you in. Please try again.";
}
