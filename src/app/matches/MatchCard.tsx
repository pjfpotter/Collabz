// One match on the /matches page (slice 3, #10): who they are, the score and
// the sentences that explain it.
//
// Slice 10 (#45) restyled it on the shared pieces: PersonCard draws the
// frame, silhouette and alias (and wraps a long alias), ScoreBadge the
// number, ReasonsList the sentences. What it SHOWS is unchanged: alias,
// silhouette, course, score, reasons and any shared skills and interests. Never an
// email or a user id (the matchesPage test checks the data has nothing else).

import { PersonCard } from "@/components/PersonCard";
import { ReasonsList } from "@/components/ReasonsList";
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
    <PersonCard
      tone={isGlitch ? "glitch" : "normal"}
      caption={isGlitch ? "Surprise match" : undefined}
      // The test ids and data the browser tests look for.
      frameProps={{
        "data-testid": isGlitch ? "glitch-card" : "match-card",
        "data-score": card.score,
        "data-alias": card.alias,
      }}
      alias={card.alias}
      silhouette={card.silhouette}
      // The course badge, as on the people list (task 10.1: the Desktop
      // layouts board shows it on every match).
      courseId={card.courseId}
      courseName={card.courseName}
      score={card.score}
      scoreLabel="Chemistry score"
      href={`/people/${card.address}`}
      rank={rank}
      size={56}
    >
      <div className="mt-3">
        <ReasonsList groups={[{ sentences: card.sentences }]} />

        {/* Shown only when there is something to show. Skills and Interests
            are for information and never change the score. */}
        {card.sharedSkills.length > 0 && (
          <p className="mt-2 text-sm text-muted">
            Shared skills: {card.sharedSkills.join(", ")}
          </p>
        )}
        {card.sharedInterests.length > 0 && (
          <p className="text-sm text-muted">
            Shared interests: {card.sharedInterests.join(", ")}
          </p>
        )}
      </div>
    </PersonCard>
  );
}
