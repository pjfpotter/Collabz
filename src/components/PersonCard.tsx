// A person shown as a card: the same content as PersonRow, in the design's
// raised, rounded-corner frame (slice 10, #45, design decision 8).
//
//   <PersonCard {...rowProps}>
//     <p>An explanation sentence.</p>
//   </PersonCard>
//
// It takes exactly PersonRow's props. It only adds the frame, so a row and a
// card can never drift apart in what they show.
//
// `tone` is "glitch" for the surprise match: a dashed border and the glitch
// colour, so it differs by pattern as well as colour (collab-graph spec,
// "Glitch matches look different").

import type { ComponentProps } from "react";

import { PersonRow } from "@/components/PersonRow";

type PersonCardProps = ComponentProps<typeof PersonRow> & {
  tone?: "normal" | "glitch";
};

export function PersonCard({ tone = "normal", ...rowProps }: PersonCardProps) {
  const frame =
    tone === "glitch"
      ? "border-2 border-dashed border-glitch"
      : "border border-line";

  return (
    <article className={`rounded-feature bg-surface p-4 ${frame}`}>
      <PersonRow {...rowProps} />
    </article>
  );
}
