"use server";
// The sign-in form's Server Action (slice 1, #8, design decision 3).
//
// "use server" means this runs on the server, even though the form that
// calls it is in the browser. Next.js wires the two together for us.
//
// Why a Server Action and not an /api/... route like /api/requests: Auth.js
// v5's signIn() is made to be called this way (it sets cookies), and the form
// still works if the browser's JavaScript hasn't loaded yet.

import { sendMagicLink } from "@/lib/auth/magicLink";
import { checkEmailAddress } from "@/lib/auth/signUpForm";

// What the form shows after each try. SignInForm.tsx reads it.
export type SignInFormState =
  | { step: "ready" }
  | { step: "problem"; message: string; email: string }
  | { step: "sent"; email: string };

// After opening the link, the person comes back to /signin, and the page
// decides where they go next: home if their account is finished, or the
// finish-sign-up step if it isn't (an email with no account yet).
const AFTER_LINK = "/signin";

// useActionState passes the previous state first, then the form's fields.
// We don't need the previous state, hence the underscore.
export async function requestSignInLink(
  _previous: SignInFormState,
  formData: FormData,
): Promise<SignInFormState> {
  // formData.get() can return a file or null, so turn it into plain text.
  const email = String(formData.get("email") ?? "");

  const problem = checkEmailAddress(email);
  if (problem) {
    return { step: "problem", message: problem, email };
  }

  const result = await sendMagicLink(email, AFTER_LINK);
  if (result === "failed") {
    return {
      step: "problem",
      message: "We couldn't send the email just now. Please try again in a minute.",
      email,
    };
  }

  return { step: "sent", email: email.trim() };
}
