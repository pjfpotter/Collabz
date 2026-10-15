"use client";
// ===========================================================================
// STAND-IN FOR SLICE 2's PickStep (#9 design decision 2). REPLACE WHEN
// SLICE 2 LANDS. Listed with the other stand-ins in
// src/lib/account/standIns.ts.
// ===========================================================================
//
// One category's choices as big tap-friendly buttons, the way slice 2's
// onboarding will show them:
//   - each tag is a button that toggles on and off (aria-pressed tells a
//     screen reader whether it's picked),
//   - in a pick-exactly-one category, picking a new tag replaces the old one,
//   - once the limit is reached, the other tags are disabled and a line says
//     "You can pick up to N",
//   - Save stays disabled until the minimum is met.
// There is no text box anywhere: every answer is picked from a list (B1).
//
// A retired tag the person still has is shown as picked and can be removed,
// but once removed it's disabled, so it can't be picked again.
//
// The server checks everything again (checkEditedPicks); these limits in the
// browser are only there to guide.
//
// Owner: slice 7 (#14), until slice 2 replaces it.

import Link from "next/link";
import { useActionState, useState } from "react";

import { limitMessage, type EditableCategory } from "@/lib/account/standIns";

import { saveEdit, type EditFormState } from "./actions";
import { errorTextClasses, primaryButtonClasses, textLinkClasses } from "@/components/formStyles";

type PickStepStandInProps = {
  category: EditableCategory;
  alreadyPicked: string[];
};

const startingState: EditFormState = { problem: null };

export function PickStepStandIn({ category, alreadyPicked }: PickStepStandInProps) {
  const [picked, setPicked] = useState<string[]>(alreadyPicked);
  const [state, formAction, pending] = useActionState(saveEdit, startingState);

  const pickOnlyOne = category.pickMax === 1;
  const atLimit = picked.length >= category.pickMax;
  const enough = picked.length >= category.pickMin;

  function toggle(tagId: string) {
    if (picked.includes(tagId)) {
      setPicked(picked.filter((id) => id !== tagId));
    } else if (pickOnlyOne) {
      setPicked([tagId]);
    } else if (!atLimit) {
      setPicked([...picked, tagId]);
    }
  }

  return (
    <form action={formAction} className="mt-6">
      {/* What the server receives: the category, and one "picks" field per
          picked tag. */}
      <input type="hidden" name="categoryId" value={category.id} />
      {picked.map((tagId) => (
        <input key={tagId} type="hidden" name="picks" value={tagId} />
      ))}

      <p className="text-sm text-muted" data-testid="pick-limit">
        {limitMessage(category)}
        {!pickOnlyOne && atLimit && ` You can pick up to ${category.pickMax}.`}
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {category.tags.map((tag) => {
          const isPicked = picked.includes(tag.id);
          // Can't add more once at the limit (unless it's pick-one, where
          // tapping swaps), and can't re-pick a retired tag.
          const disabled =
            !isPicked && ((atLimit && !pickOnlyOne) || tag.retired);
          return (
            <li key={tag.id}>
              <button
                type="button"
                aria-pressed={isPicked}
                disabled={disabled}
                onClick={() => toggle(tag.id)}
                // The same look as OptionCard (selected = brand border, a glow
                // and a tick), but kept as a <button aria-pressed> because
                // this is slice 2's pick step stand-in and the tests find it
                // that way, including by its FIRST span being the tag's
                // name. The tick is positioned over the corner for that
                // reason, as a last span, rather than laid out beside it.
                className={`relative block min-h-11 w-full rounded-feature border bg-surface py-3 pr-12 pl-4 text-left disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-text ${
                  isPicked
                    ? "border-2 border-primary-text font-semibold shadow-glow"
                    : "border-line-strong"
                }`}
              >
                <span className="block">
                  {tag.name}
                  {tag.retired && " (no longer offered)"}
                </span>
                {tag.description && (
                  <span className="mt-1 block text-sm font-normal text-muted">
                    {tag.description}
                  </span>
                )}
                {/* The tick, so a selected card is never shown by colour
                    alone. */}
                {isPicked && (
                  <span
                    aria-hidden="true"
                    className="absolute top-3 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary"
                  >
                    ✓
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {state.problem && (
        <p role="alert" className={`mt-4 ${errorTextClasses}`} data-testid="edit-problem">
          {state.problem}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!enough || pending}
          className={primaryButtonClasses}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <Link href="/account" className={textLinkClasses}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
