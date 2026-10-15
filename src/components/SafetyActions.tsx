"use client";

// The "Report or block" area on a profile and in a conversation (slice 9,
// #16, design 4).
//
// It is a Client Component because pressing a button sends something from
// the browser. It calls the two Server Actions in safetyActions.ts and shows
// the answer in words.
//
// WHY <details>: it keeps these two serious actions out of the way until
// someone asks for them, works without any extra state, and is keyboard and
// screen reader friendly by default.
//
// WHY BLOCK ASKS TWICE: a block can't be undone in the MVP (design,
// Risks), so the first press only shows "Are you sure?".
//
// Block takes the person away from this page, so after a block we go to the
// people list. Report stays on the page and shows a thank-you.

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  checkboxClasses,
  errorTextClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
} from "@/components/formStyles";
import { REPORT_REASONS } from "@/lib/safety/reasons";

import { blockPersonAction, reportPersonAction } from "@/lib/safety/safetyActions";

type SafetyActionsProps = {
  // The other person's address (the last part of their profile address).
  address: string;
  // Their alias, only used in the words on the buttons.
  alias: string;
};

type Answer = { ok: boolean; message: string } | null;

export function SafetyActions({ address, alias }: SafetyActionsProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [reportAnswer, setReportAnswer] = useState<Answer>(null);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [blockAnswer, setBlockAnswer] = useState<Answer>(null);
  const [busy, setBusy] = useState(false);

  async function sendReport() {
    setBusy(true);
    try {
      setReportAnswer(await reportPersonAction(address, reason));
    } catch {
      setReportAnswer({ ok: false, message: "Something went wrong. Please try again." });
    }
    setBusy(false);
  }

  async function sendBlock() {
    setBusy(true);
    try {
      const answer = await blockPersonAction(address);
      setBlockAnswer(answer);
      if (answer.ok) {
        // They are gone from your lists now, so leave this page.
        router.push("/people");
        router.refresh();
      }
    } catch {
      setBlockAnswer({ ok: false, message: "Something went wrong. Please try again." });
    }
    setBusy(false);
  }

  return (
    <details className="mt-8 border-t border-line pt-4" data-testid="safety-actions">
      <summary className="cursor-pointer font-medium">Report or block</summary>

      <section className="mt-4" aria-label={`Report ${alias}`}>
        <h2 className="text-xl">Report {alias}</h2>
        <p className="mt-1 text-sm text-muted">
          Choose the reason closest to what happened. An admin will review it.
        </p>
        <fieldset className="mt-2">
          <legend className="sr-only">Reason for the report</legend>
          <ul className="space-y-2">
            {REPORT_REASONS.map((option) => (
              <li key={option}>
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="radio"
                    name="report-reason"
                    value={option}
                    checked={reason === option}
                    onChange={() => setReason(option)}
                    className={checkboxClasses}
                  />
                  {option}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <button
          type="button"
          onClick={sendReport}
          disabled={busy}
          className={`mt-2 ${secondaryButtonClasses}`}
        >
          Send report
        </button>
        {reportAnswer && (
          <p
            role="status"
            data-testid="report-message"
            className={`mt-2 text-sm ${reportAnswer.ok ? "text-muted" : errorTextClasses}`}
          >
            {reportAnswer.message}
          </p>
        )}
      </section>

      <section className="mt-6" aria-label={`Block ${alias}`}>
        <h2 className="text-xl">Block {alias}</h2>
        <p className="mt-1 text-sm text-muted">
          You will stop seeing each other, any conversation closes, and neither
          of you can send the other a request or a message. This can&apos;t be
          undone.
        </p>
        {confirmingBlock ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={sendBlock}
              disabled={busy}
              className={primaryButtonClasses}
            >
              Yes, block {alias}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingBlock(false)}
              disabled={busy}
              className={secondaryButtonClasses}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingBlock(true)}
            className={`mt-2 ${secondaryButtonClasses}`}
          >
            Block
          </button>
        )}
        {blockAnswer && !blockAnswer.ok && (
          <p role="status" data-testid="block-message" className={`mt-2 ${errorTextClasses}`}>
            {blockAnswer.message}
          </p>
        )}
      </section>
    </details>
  );
}
