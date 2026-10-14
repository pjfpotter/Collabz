// "Signed in as … / Sign out" in the nav bar, on every page (slice 1, #8,
// design decision 9; user-auth spec: "Sign in and sign out").
//
// It shows the REAL magic-link sign-in only. While the pretend cohort is on,
// the dev switcher beside it shows the pretend side.
//
// - Signed in: their own email and a Sign out button. Showing the email is
//   fine because only they can see it: the rule is that OTHER people never
//   see someone's sign-up email.
// - Not signed in: "Not signed in". We don't add Sign in / Sign up links
//   here, because the nav bar already shows those to everyone (hiding links
//   by sign-in state is join-up's job, #17).
//
// Someone with an unfinished or suspended account still sees Sign out, so
// they can always leave.
//
// A Server Component: the button is a plain form, so it works even before
// the page's JavaScript has loaded.
//
// Owner: slice 1 (#8).

import { signOut } from "@/auth";
import { getSessionUser } from "@/lib/auth/session";

export async function SignedInStatus() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return (
      <p className="text-sm text-muted" data-testid="signed-in-status">
        Not signed in
      </p>
    );
  }

  // A Server Action written right here: "use server" inside the function
  // makes it run on the server when the form is sent. It ends the session
  // (deleting its row in the Session table) and goes to the home page.
  async function signOutAndGoHome() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <form
      action={signOutAndGoHome}
      className="flex flex-wrap items-center gap-2 text-sm text-muted"
      data-testid="signed-in-status"
    >
      <span>
        Signed in as <strong className="text-foreground">{sessionUser.email}</strong>
      </span>
      {/* min-h-11 is the 44px tap target; the border is line-strong because
          control borders need 3:1 against the page. */}
      <button
        type="submit"
        className="min-h-11 rounded-control border border-line-strong px-3 font-medium text-foreground hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-text"
      >
        Sign out
      </button>
    </form>
  );
}
