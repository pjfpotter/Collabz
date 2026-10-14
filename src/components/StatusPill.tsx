// A small label saying where a request stands: Waiting, Connected, Declined
// (slice 10, #45, design decision 8; visual-design spec).
//
//   <StatusPill status="waiting">Waiting</StatusPill>
//
// The WORD is passed in as the children, so each page keeps its own wording
// and this component only decides how it looks. The status is never shown by
// colour alone: the word is always there, and each status also has a
// different border style and weight.

import type { ReactNode } from "react";

export type PillStatus = "waiting" | "connected" | "declined";

type StatusPillProps = {
  status: PillStatus;
  children: ReactNode;
};

// The look of each status. The classes are written out in full (not built
// from pieces) because Tailwind only creates the classes it can see in the
// source as whole words.
const LOOK: Record<PillStatus, string> = {
  // Waiting: quiet. A dashed border says "not settled yet".
  waiting: "border-dashed border-line-strong text-muted",
  // Connected: the brand fill, the only filled pill.
  connected: "border-transparent bg-primary text-on-primary",
  // Declined: danger text with a plain border.
  declined: "border-danger text-danger",
};

export function StatusPill({ status, children }: StatusPillProps) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full border px-3 text-xs font-bold ${LOOK[status]}`}
      data-status={status}
    >
      {children}
    </span>
  );
}
