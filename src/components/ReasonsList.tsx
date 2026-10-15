// The "why you match" explanation: short sentences in labelled groups
// (slice 10, #45, design decision 8).
//
//   <ReasonsList
//     title="Why you match"
//     groups={[
//       { heading: "You fill each other's gaps", sentences: ["..."] },
//       { heading: "In common", note: "For info, not in the score", sentences: ["..."] },
//     ]}
//   />
//
// The wording of every heading and sentence comes from the page. Product
// rule 6: a score is explained in plain sentences, so this is what sits
// beside a score.

type ReasonGroup = {
  // Left out for one unlabelled list.
  heading?: string;
  // A small second line, e.g. "For info, not in the score".
  note?: string;
  sentences: string[];
};

type ReasonsListProps = {
  title?: string;
  groups: ReasonGroup[];
};

export function ReasonsList({ title, groups }: ReasonsListProps) {
  return (
    <section>
      {title && <h2 className="text-2xl text-foreground">{title}</h2>}

      <div className={title ? "mt-3 space-y-4" : "space-y-4"}>
        {groups.map((group, index) => (
          <div key={group.heading ?? index}>
            {group.heading && (
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                {group.heading}
              </h3>
            )}
            {group.note && <p className="text-sm text-muted">{group.note}</p>}
            <ul className="mt-1 space-y-1">
              {group.sentences.map((sentence) => (
                <li key={sentence} className="text-base leading-6 text-foreground">
                  {sentence}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
