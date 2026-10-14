// One tag on /admin/categories: its rename, description, move, retire and
// (for Seeking and Quality tags) pairing forms (slice 8, #15, design 6, 10).
//
// A Server Component of plain forms: each button posts to a Server Action in
// actions.ts. No client-side JavaScript, so it also works on a slow phone.

import {
  moveTagAction,
  renameTagAction,
  setTagPairingsAction,
  setTagRetiredAction,
  updateTagDescriptionAction,
} from "./actions";

// A tag this one can be paired with, and whether it is currently paired.
export type PartnerOption = {
  id: string;
  name: string;
  retired: boolean;
  paired: boolean;
};

export type TagCardProps = {
  tag: { id: string; name: string; description: string; retired: boolean };
  // Whether the Move up / Move down buttons make sense.
  isFirst: boolean;
  isLast: boolean;
  // null for tags that have no pairings (every category except Seeking and
  // Qualities).
  partnerOptions: PartnerOption[] | null;
  // "Quality" for a Seeking tag, "Seeking" for a Quality tag. Only used in
  // the pairing heading.
  partnerKind: "Quality" | "Seeking" | null;
};

const BUTTON = "rounded border border-current px-3 py-1";

export function TagCard({ tag, isFirst, isLast, partnerOptions, partnerKind }: TagCardProps) {
  return (
    <li className={`rounded border border-current/30 p-3 ${tag.retired ? "opacity-60" : ""}`}>
      <p className="font-semibold">
        {tag.name}
        {tag.retired && <span className="font-normal"> (retired)</span>}
      </p>
      <p className="text-xs">id: {tag.id}</p>

      <form action={renameTagAction} className="mt-2 flex gap-2">
        <input type="hidden" name="id" value={tag.id} />
        <label className="sr-only" htmlFor={`name-${tag.id}`}>
          New name for {tag.name}
        </label>
        <input
          id={`name-${tag.id}`}
          name="name"
          defaultValue={tag.name}
          className="min-w-0 flex-1 rounded border border-current/40 px-2 py-1"
        />
        <button type="submit" className={BUTTON}>
          Rename
        </button>
      </form>

      <form action={updateTagDescriptionAction} className="mt-2 flex gap-2">
        <input type="hidden" name="id" value={tag.id} />
        <label className="sr-only" htmlFor={`description-${tag.id}`}>
          Description for {tag.name}
        </label>
        <input
          id={`description-${tag.id}`}
          name="description"
          defaultValue={tag.description}
          className="min-w-0 flex-1 rounded border border-current/40 px-2 py-1"
        />
        <button type="submit" className={BUTTON}>
          Save description
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-2">
        <form action={moveTagAction}>
          <input type="hidden" name="id" value={tag.id} />
          <input type="hidden" name="direction" value="up" />
          <button type="submit" disabled={isFirst} className={`${BUTTON} disabled:opacity-40`}>
            Move up
          </button>
        </form>
        <form action={moveTagAction}>
          <input type="hidden" name="id" value={tag.id} />
          <input type="hidden" name="direction" value="down" />
          <button type="submit" disabled={isLast} className={`${BUTTON} disabled:opacity-40`}>
            Move down
          </button>
        </form>
        <form action={setTagRetiredAction}>
          <input type="hidden" name="id" value={tag.id} />
          <input type="hidden" name="retired" value={tag.retired ? "false" : "true"} />
          <button type="submit" className={BUTTON}>
            {tag.retired ? "Un-retire" : "Retire"}
          </button>
        </form>
      </div>

      {partnerOptions && partnerKind && (
        // <details> is the browser's own show/hide, so no JavaScript is needed.
        <details className="mt-3">
          <summary className="cursor-pointer text-sm underline">
            Pairs with {partnerKind} tags (
            {partnerOptions.filter((option) => option.paired).length})
          </summary>
          <form action={setTagPairingsAction} className="mt-2 space-y-1">
            <input type="hidden" name="id" value={tag.id} />
            {partnerOptions.map((option) => (
              <label key={option.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="paired"
                  value={option.id}
                  defaultChecked={option.paired}
                  className="mt-1"
                />
                <span>
                  {option.name}
                  {option.retired && " (retired)"}
                </span>
              </label>
            ))}
            <button type="submit" className={`${BUTTON} mt-2`}>
              Save pairings
            </button>
            <p className="text-xs">
              Scores don&apos;t change until you press &ldquo;Rescore everyone&rdquo; at
              the bottom of this page.
            </p>
          </form>
        </details>
      )}
    </li>
  );
}
