// One person in a list: silhouette, alias, course and (optionally) a score
// (slice 10, #45, design decision 8). Used on the matches, people, requests
// and messages pages and in the graph's panel.
//
//   <PersonRow
//     alias="The Golden Retriever CEO" silhouette="silhouette-03"
//     courseId="software" courseName="Software"
//     score={83} scoreLabel="Chemistry score" href="/people/the-golden-retriever-ceo"
//   >
//     (anything else, such as an explanation or buttons)
//   </PersonRow>
//
// WHAT IT PROMISES (visual-design spec "Long aliases wrap"): the alias is
// NEVER cut off. It wraps onto as many lines as it needs, and a single very
// long word breaks inside itself (overflow-wrap: anywhere) rather than
// pushing the page sideways.
//
// It shows only an alias and a silhouette, never an email (rule 2).

import Link from "next/link";
import type { ReactNode } from "react";

import { CourseMark } from "@/components/CourseMark";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SilhouetteStandIn } from "@/lib/cohort/SilhouetteStandIn";

type PersonRowProps = {
  alias: string;
  silhouette: string;
  courseId: string | null;
  courseName: string | null;
  // Left out where a score isn't shown (e.g. the requests page).
  score?: number;
  // What a screen reader says for the score. Required with `score`.
  scoreLabel?: string;
  // Where the alias links to. Left out for a row that isn't a link.
  href?: string;
  // Silhouette size in pixels.
  size?: number;
  // Anything shown under the name: reasons, a sentence, buttons.
  children?: ReactNode;
};

export function PersonRow({
  alias,
  silhouette,
  courseId,
  courseName,
  score,
  scoreLabel,
  href,
  size = 48,
  children,
}: PersonRowProps) {
  // The alias in the display face. `break-words` is Tailwind's
  // overflow-wrap: break-word; `[overflow-wrap:anywhere]` is stronger and
  // also lets a long word shrink the row's minimum width, which is what
  // stops it pushing the page wider.
  const aliasClasses =
    "font-display text-2xl leading-7 text-foreground [overflow-wrap:anywhere]";

  return (
    <div className="flex items-start gap-3">
      <SilhouetteStandIn silhouette={silhouette} size={size} />

      {/* min-w-0 lets this column be narrower than its content, so a long
          alias wraps inside it. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className={aliasClasses}>
            {href ? (
              <Link href={href} className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-text">
                {alias}
              </Link>
            ) : (
              alias
            )}
          </h3>
          {score !== undefined && scoreLabel && <ScoreBadge score={score} label={scoreLabel} />}
        </div>

        {courseName && (
          <div className="mt-1">
            <CourseMark courseId={courseId} name={courseName} variant="plain" />
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
