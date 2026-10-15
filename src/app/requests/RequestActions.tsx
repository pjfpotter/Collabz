"use client";

// The Approve and Decline buttons on one waiting request (slice 5, #12,
// design decision 9).
//
// It is a Client Component because pressing a button sends something from the
// browser. It posts to /api/requests/[id]/approve or .../decline, and:
//   - on success, asks Next.js to refresh the page, so the request leaves the
//     "waiting" list and the nav bar's count drops, with no manual reload;
//   - on a refusal (404, 409), shows the server's own sentence and stays, so
//     the person can see WHY (for example "already answered").

import { useRouter } from "next/navigation";
import { useState } from "react";
import { primaryButtonClasses, secondaryButtonClasses } from "@/components/formStyles";

type RequestActionsProps = {
  // The request's id. It is what the routes are addressed by, and it is not a
  // user id or an email.
  requestId: string;
  // The sender's alias, used only to give each button a name a screen reader
  // can tell apart from the others on the page.
  alias: string;
};

// What the buttons are doing: waiting to be pressed, sending, or showing a
// refusal.
type ActionsState =
  | { step: "ready" }
  | { step: "sending" }
  | { step: "refused"; message: string };

export function RequestActions({ requestId, alias }: RequestActionsProps) {
  const router = useRouter();
  const [state, setState] = useState<ActionsState>({ step: "ready" });

  async function answer(which: "approve" | "decline") {
    setState({ step: "sending" });
    try {
      const response = await fetch(`/api/requests/${requestId}/${which}`, { method: "POST" });
      // Every answer from the routes is JSON with a "message", including the
      // refusals, so one line handles all of them.
      const body: { ok?: boolean; message?: string } = await response.json();

      if (response.ok) {
        // Re-draws this page on the server. The request is no longer waiting,
        // so it disappears, and so does this component.
        router.refresh();
        return;
      }
      setState({
        step: "refused",
        message: body.message ?? "Something went wrong. Please try again.",
      });
    } catch {
      // No network, or the server sent something that wasn't JSON.
      setState({ step: "refused", message: "Something went wrong. Please try again." });
    }
  }

  const busy = state.step === "sending";

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => answer("approve")}
          disabled={busy}
          // aria-label gives each button its own name on a page with several
          // requests. The visible word stays "Approve".
          aria-label={`Approve request from ${alias}`}
          className={primaryButtonClasses}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => answer("decline")}
          disabled={busy}
          aria-label={`Decline request from ${alias}`}
          className={secondaryButtonClasses}
        >
          Decline
        </button>
      </div>

      {/* role="status" makes a screen reader read the answer out when it
          appears. */}
      {state.step === "refused" && (
        <p className="mt-2 text-sm text-muted" role="status" data-testid="answer-message">
          {state.message}
        </p>
      )}
    </div>
  );
}
