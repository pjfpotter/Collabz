"use client";

// The "Connect" button on a profile (slice 4, #11, design decision 10).
//
// It is a Client Component because pressing it sends something from the
// browser. It posts to /api/people/[alias]/connect and shows the answer in
// words: "Your connection request has been sent.", or the reason it was
// refused (slice 5, #12, src/lib/requests/messages.ts).

import { useState } from "react";
import { primaryButtonClasses } from "@/components/formStyles";

type ConnectButtonProps = {
  // The person's address (the last part of the profile's own address).
  address: string;
};

// What the button is doing: waiting to be pressed, sending, or showing the
// server's answer.
type ButtonState =
  | { step: "ready" }
  | { step: "sending" }
  | { step: "answered"; message: string };

export function ConnectButton({ address }: ConnectButtonProps) {
  const [state, setState] = useState<ButtonState>({ step: "ready" });

  async function sendRequest() {
    setState({ step: "sending" });
    try {
      const response = await fetch(`/api/people/${address}/connect`, { method: "POST" });
      // Every answer from the route is JSON with a "message", including the
      // refusals (401, 403, 404), so one line handles all of them.
      const answer: { message?: string } = await response.json();
      setState({
        step: "answered",
        message: answer.message ?? "Something went wrong. Please try again.",
      });
    } catch {
      // No network, or the server sent something that wasn't JSON.
      setState({ step: "answered", message: "Something went wrong. Please try again." });
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={sendRequest}
        disabled={state.step === "sending"}
        className={primaryButtonClasses}
      >
        {state.step === "sending" ? "Sending…" : "Connect"}
      </button>

      {/* role="status" makes a screen reader read the answer out when it
          appears. */}
      {state.step === "answered" && (
        <p className="mt-2 text-sm text-muted" role="status" data-testid="connect-message">
          {state.message}
        </p>
      )}
    </div>
  );
}
