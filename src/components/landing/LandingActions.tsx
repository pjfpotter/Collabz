// THE MAIN BUTTON ON THE HOME PAGE (landing-page-demo, spec: "The main button
// follows the viewer").
//
// Signed out: "Sign up" (the main action) and a quieter "Sign in".
// Signed in:  "Go to matches", and neither of the other two.
//
// WHY getCurrentUser(): it is the same "who is this?" answer the nav bar and
// every page use, so this button can't disagree with the rest of the app. It
// also means the pretend-user switcher on previews changes this button too.
//
// A Server Component, so the choice is made on the server and the browser is
// sent finished HTML (no flash of the wrong button).

import Link from "next/link";

import { primaryButtonClasses, secondaryButtonClasses } from "@/components/formStyles";
import { getCurrentUser } from "@/lib/currentUser";

// Says whether someone is signed in, or false if we can't tell.
//
// WHY A try/catch IN ITS OWN FUNCTION: the home page must always load. If the
// database blinks, showing the visitor buttons is better than an error page,
// and "Sign up" still works. (Same reasoning as the nav bar's request count,
// and kept out of the drawing code because React's linter rule says a
// try/catch can't wrap a component's return.)
async function isSignedIn(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return user !== null;
  } catch {
    return false;
  }
}

// The classes are the shared button looks, plus the bits a <Link> needs that a
// <button> gets for free: it is an inline <a>, so it must be centred and made
// block-level to reach the 44px tap height (min-h-11 in the shared classes).
const linkButtonExtra = "inline-flex items-center justify-center";

export async function LandingActions() {
  const signedIn = await isSignedIn();

  if (signedIn) {
    return (
      <div className="mt-8 flex flex-wrap items-center gap-3" data-testid="landing-actions">
        <Link href="/matches" className={`${primaryButtonClasses} ${linkButtonExtra}`}>
          Go to matches
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3" data-testid="landing-actions">
      <Link href="/signup" className={`${primaryButtonClasses} ${linkButtonExtra}`}>
        Sign up
      </Link>
      <Link href="/signin" className={`${secondaryButtonClasses} ${linkButtonExtra}`}>
        Sign in
      </Link>
    </div>
  );
}
