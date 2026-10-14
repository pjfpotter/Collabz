"use client";

// The send form under a conversation (slice 6, #13, design decision 5).
//
// It is a Client Component because sending happens in the browser. It posts to
// /api/messages/[conversationId], and:
//   - on success, clears the box and asks Next.js to refresh the page, so the
//     new message appears with no manual reload;
//   - on a refusal, shows the server's own sentence and keeps what was typed,
//     so nothing is lost.
//
// WHY maxLength HERE IF THE SERVER CHECKS: it stops people typing past the
// limit and avoids a pointless round trip. The server check is the real one;
// this is only a courtesy.

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { MESSAGE_MAX_LENGTH } from "@/lib/messages/messages";

type SendMessageFormProps = {
  conversationId: string;
};

// What the form is doing: ready, sending, or showing a refusal.
type FormState =
  | { step: "ready" }
  | { step: "sending" }
  | { step: "refused"; message: string };

export function SendMessageForm({ conversationId }: SendMessageFormProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [state, setState] = useState<FormState>({ step: "ready" });

  async function send(event: FormEvent<HTMLFormElement>) {
    // Stop the browser doing its own full-page form post.
    event.preventDefault();
    setState({ step: "sending" });

    try {
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      // Every answer from the route is JSON with a "message", refusals too.
      const answer: { ok?: boolean; message?: string } = await response.json();

      if (response.ok) {
        setText("");
        setState({ step: "ready" });
        // Re-draws the page on the server, so the new message is listed.
        router.refresh();
        return;
      }
      setState({
        step: "refused",
        message: answer.message ?? "Something went wrong. Please try again.",
      });
    } catch {
      // No network, or the server sent something that wasn't JSON.
      setState({ step: "refused", message: "Something went wrong. Please try again." });
    }
  }

  const busy = state.step === "sending";
  const remaining = MESSAGE_MAX_LENGTH - text.length;

  return (
    <form onSubmit={send}>
      <label htmlFor="message-body" className="block font-semibold">
        Your message
      </label>
      <textarea
        id="message-body"
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={MESSAGE_MAX_LENGTH}
        rows={4}
        disabled={busy}
        className="mt-1 w-full rounded border border-current/40 bg-transparent p-2"
      />
      <p className="text-sm" data-testid="characters-remaining">
        {remaining} characters left
      </p>

      <button
        type="submit"
        disabled={busy}
        className="mt-2 rounded border border-current px-4 py-2 font-semibold disabled:opacity-50"
      >
        Send
      </button>

      <p className="mt-2 text-sm">
        New messages from the other person appear when you refresh this page.
      </p>

      {/* role="status" makes a screen reader read the answer out when it
          appears. */}
      {state.step === "refused" && (
        <p className="mt-2 text-sm" role="status" data-testid="send-message">
          {state.message}
        </p>
      )}
    </form>
  );
}
