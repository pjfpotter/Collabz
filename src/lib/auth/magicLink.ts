// Ask Auth.js to email someone a magic link (slice 1, #8).
//
// Both the sign-in form and the sign-up form send links, and both need to
// know whether it worked, so they can show "check your email" or a problem
// right there in the form. This is the one place that does it.
//
// Server-only: it uses signIn() from src/auth.ts, which sets cookies.
//
// Owner: slice 1 (#8).

import { signIn } from "@/auth";

// - email: where to send the link (spaces around it are removed).
// - redirectTo: the page the person lands on after opening the link. For
//   sign-up it carries their course and terms (design decision 3).
//
// Returns "sent" or "failed". "failed" means Auth.js or Resend refused, e.g.
// Resend is down or the sender address isn't allowed. The person can simply
// try again, so we don't explain the technical reason to them.
export async function sendMagicLink(
  email: string,
  redirectTo: string,
): Promise<"sent" | "failed"> {
  // `redirect: false` asks Auth.js NOT to move the browser to its own
  // "check your email" page. Instead it hands back the address it would have
  // gone to, and the form shows our own message in place.
  const nextAddress = await signIn("resend", {
    email: email.trim(),
    redirectTo,
    redirect: false,
  });

  // When sending fails, Auth.js's address points at its error page with an
  // "error=" in it. Any other address means the email went out.
  if (typeof nextAddress === "string" && nextAddress.includes("error=")) {
    return "failed";
  }
  return "sent";
}
