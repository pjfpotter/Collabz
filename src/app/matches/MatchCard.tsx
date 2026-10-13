// One person on the matches page (slice 3, #10, task 6.2).
//
// Shows alias, silhouette, score and the reasons, with a link to their
// profile. It never receives an email, a user id or a photo (see
// src/lib/matching/matchesPage.ts for why), so it cannot show one.
//
// The glitch match is drawn differently from the top 5 on purpose: a dashed
// border and a "Surprise" label. It is never told apart by colour alone, so
// it still reads correctly for someone who can't see the colours.

import Link from "next/link";

import { SilhouetteStandIn } from "@/lib/cohort/standIns";
import type { MatchCardData } from "@/lib/matching/matchesPage";

type MatchCardProps = {
  card: MatchCardData;
  // "top" for one of the five best matches, "glitch" for the surprise.
  kind: "top" | "glitch";
  // 1 to 5 for a top match; left out for the surprise.
  rank?: number;
};

export function MatchCard({ card, kind, rank }: MatchCardProps) {
  const isGlitch = kind === "glitch";

  return (
    <article
      className={
        isGlitch
          ? "rounded-lg border-2 border-dashed border-current p-4"
          : "rounded-lg border border-current/30 p-4"
      }
      data-testid={isGlitch ? "glitch-card" : "match-card"}
      data-score={card.score}
      data-alias={card.alias}
    >
      {isGlitch && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide">
          Surprise match
        </p>
      )}

      <div className="flex items-start gap-3">
        <SilhouetteStandIn silhouette={card.silhouette} size={56} />

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">
            {rank !== undefined && <span className="mr-1">{rank}.</span>}
            <Link href={`/people/${card.address}`} className="underline underline-offset-4">
              {card.alias}
            </Link>
          </h3>

          <p className="text-sm">
            Chemistry score: <span className="font-semibold">{card.score}</span>
          </p>

          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {card.sentences.map((sentence) => (
              <li key={sentence}>{sentence}</li>
            ))}
          </ul>

          {/* Shown only when there is something to show. Skills and
              Interests are for information and never change the score. */}
          {card.sharedSkills.length > 0 && (
            <p className="mt-2 text-sm">Shared skills: {card.sharedSkills.join(", ")}</p>
          )}
          {card.sharedInterests.length > 0 && (
            <p className="text-sm">Shared interests: {card.sharedInterests.join(", ")}</p>
          )}
        </div>
      </div>
    </article>
  );
}
