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
  // A small label above the person, e.g. "Surprise match".
  caption?: string;
  // Attributes the page's tests look for on the card. Only data-* ones, so
  // the card can't be made to carry anything else by accident.
  frameProps?: {
    "data-testid"?: string;
    "data-score"?: number;
    "data-alias"?: string;
  };
};

export function PersonCard({
  tone = "normal",
  caption,
  frameProps,
  ...rowProps
}: PersonCardProps) {
  const frame =
    tone === "glitch"
      ? "border-2 border-dashed border-glitch"
      : "border border-line";

  return (
    <article className={`rounded-feature bg-surface p-4 ${frame}`} {...frameProps}>
      {caption && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-glitch">
          {caption}
        </p>
      )}
      <PersonRow {...rowProps} />
    </article>
  );
}
