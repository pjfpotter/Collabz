// A chemistry score as a small round-cornered number (slice 10, #45).
//
//   <ScoreBadge score={85} />
//
// Product rule 6: scores are explained in plain sentences, never shown as a
// naked number. So this badge is only ever shown NEXT TO the sentences that
// explain it (a person card, the "why you match" list), and it carries a
// screen-reader label so the number is never read out on its own.

type ScoreBadgeProps = {
  score: number;
  // What a screen reader says, e.g. "Chemistry score". Passed in so the
  // page's own wording is kept.
  label: string;
};

export function ScoreBadge({ score, label }: ScoreBadgeProps) {
  return (
    <span
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-control bg-surface-2 px-2 text-sm font-bold text-foreground"
      data-score={score}
    >
      <span className="sr-only">{label}: </span>
      {score}
    </span>
  );
}
