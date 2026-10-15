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
import {
  adminButtonClasses,
  adminCardClasses,
  adminMetaClasses,
  adminRowInputClasses,
} from "../adminStyles";
import { checkboxClasses } from "@/components/formStyles";

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

export function TagCard({ tag, isFirst, isLast, partnerOptions, partnerKind }: TagCardProps) {
  return (
    // A retired tag is faded AND says "(retired)", so it never relies on fading alone.
    <li className={`${adminCardClasses} ${tag.retired ? "opacity-60" : ""}`}>
      <p className="font-semibold">
        {tag.name}
        {tag.retired && <span className="font-normal"> (retired)</span>}
      </p>
      <p className={adminMetaClasses}>id: {tag.id}</p>

      <form action={renameTagAction} className="mt-2 flex gap-2">
        <input type="hidden" name="id" value={tag.id} />
        <label className="sr-only" htmlFor={`name-${tag.id}`}>
          New name for {tag.name}
        </label>
        <input
          id={`name-${tag.id}`}
          name="name"
          defaultValue={tag.name}
          className={adminRowInputClasses}
        />
        <button type="submit" className={adminButtonClasses}>
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
          className={adminRowInputClasses}
        />
        <button type="submit" className={adminButtonClasses}>
          Save description
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-2">
        <form action={moveTagAction}>
          <input type="hidden" name="id" value={tag.id} />
          <input type="hidden" name="direction" value="up" />
          <button type="submit" disabled={isFirst} className={adminButtonClasses}>
            Move up
          </button>
        </form>
        <form action={moveTagAction}>
          <input type="hidden" name="id" value={tag.id} />
          <input type="hidden" name="direction" value="down" />
          <button type="submit" disabled={isLast} className={adminButtonClasses}>
            Move down
          </button>
        </form>
        <form action={setTagRetiredAction}>
          <input type="hidden" name="id" value={tag.id} />
          <input type="hidden" name="retired" value={tag.retired ? "false" : "true"} />
          <button type="submit" className={adminButtonClasses}>
            {tag.retired ? "Un-retire" : "Retire"}
          </button>
        </form>
      </div>

      {partnerOptions && partnerKind && (
        // <details> is the browser's own show/hide, so no JavaScript is needed.
        <details className="mt-3">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary-text underline underline-offset-4">
            Pairs with {partnerKind} tags (
            {partnerOptions.filter((option) => option.paired).length})
          </summary>
          <form action={setTagPairingsAction} className="mt-2">
            <input type="hidden" name="id" value={tag.id} />
            {partnerOptions.map((option) => (
              <label key={option.id} className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="paired"
                  value={option.id}
                  defaultChecked={option.paired}
                  className={checkboxClasses}
                />
                <span>
                  {option.name}
                  {option.retired && " (retired)"}
                </span>
              </label>
            ))}
            <button type="submit" className={`${adminButtonClasses} mt-2`}>
              Save pairings
            </button>
            <p className="mt-1 text-xs text-muted">
              Scores don&apos;t change until you press &ldquo;Rescore everyone&rdquo; at
              the bottom of this page.
            </p>
          </form>
        </details>
      )}
    </li>
  );
}
