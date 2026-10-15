"use client";
// The email box and button on /signin (slice 1, #8).
//
// A Client Component only so it can show what happened after you press the
// button ("check your email", or what to fix) without a page reload. That is
// React's useActionState, the way the Next.js forms guide recommends. The
// real work happens on the server, in actions.ts.

import { useActionState } from "react";

import { requestSignInLink, type SignInFormState } from "./actions";
import { errorTextClasses, inputClasses, noticeClasses, primaryButtonClasses } from "@/components/formStyles";

const startingState: SignInFormState = { step: "ready" };

export function SignInForm() {
  // - state: what to show (starts as "ready").
  // - formAction: what the <form> runs when sent.
  // - pending: true while the server is working, so we can grey the button
  //   out and stop a double tap sending two emails.
  const [state, formAction, pending] = useActionState(requestSignInLink, startingState);

  // Once the email has gone, swap the form for the message. Showing the form
  // again would invite pressing the button twice.
  if (state.step === "sent") {
    return (
      <div className={`mt-6 ${noticeClasses}`} role="status" data-testid="check-email">
        <p className="font-semibold">Check your email</p>
        <p className="mt-1 text-muted">
          We sent a sign-in link to <strong>{state.email}</strong>. It works once and
          expires in 24 hours. If it isn&apos;t there, check your spam folder.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <label htmlFor="email" className="font-semibold">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        // Phones show the email keyboard and offer saved addresses.
        autoComplete="email"
        inputMode="email"
        required
        // Keep what they typed if there was a problem, so they only fix it.
        defaultValue={state.step === "problem" ? state.email : ""}
        aria-describedby={state.step === "problem" ? "email-problem" : undefined}
        className={inputClasses}
      />

      {state.step === "problem" && (
        // role="alert" makes a screen reader read the problem out at once.
        <p id="email-problem" role="alert" className={errorTextClasses}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={primaryButtonClasses}
      >
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
