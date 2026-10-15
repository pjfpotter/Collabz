"use client";
// One onboarding step: a category's tags as big tap-friendly buttons
// (slice 2, #9, design decision 2).
//
// - Each tag is a button that toggles on and off. `aria-pressed` tells a
//   screen reader whether it's picked.
// - In a "pick exactly 1" category, tapping a new tag replaces the old one.
// - Once the maximum is reached, the other tags are disabled and a line says
//   "You can pick up to N".
// There's no text box: every answer is picked from a list (B1).
//
// WHY BUTTONS AND NOT CHECKBOXES OR RADIOS: big tap targets on a phone, and
// still accessible through aria-pressed.
//
// WHY ITS OWN COMPONENT: slice 7 can reuse it to edit one category at a time
// (it uses a stand-in copy until join-up, #17).
//
// It only shows picks and reports changes. Moving between steps, and blocking
// "Next" below the minimum, is the wizard's job (OnboardingWizard.tsx).

import { pickLimitMessage } from "@/lib/profile/validateAnswers";

export type PickStepCategory = {
  id: string;
  name: string;
  pickMin: number;
  pickMax: number;
  tags: { id: string; name: string; description: string }[];
};

type PickStepProps = {
  category: PickStepCategory;
  picked: string[];
  onChange: (picked: string[]) => void;
};

export function PickStep({ category, picked, onChange }: PickStepProps) {
  const pickOnlyOne = category.pickMax === 1;
  const atLimit = picked.length >= category.pickMax;

  function toggle(tagId: string) {
    if (picked.includes(tagId)) {
      onChange(picked.filter((id) => id !== tagId)); // un-pick
    } else if (pickOnlyOne) {
      onChange([tagId]); // swap the one pick
    } else if (!atLimit) {
      onChange([...picked, tagId]); // add, if there's room
    }
  }

  return (
    <div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400" data-testid="pick-limit">
        {pickLimitMessage(category)}
        {/* Spec: "they are told the limit is 4". Shown once they hit it. */}
        {!pickOnlyOne && atLimit && ` You can pick up to ${category.pickMax}.`}
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {category.tags.map((tag) => {
          const isPicked = picked.includes(tag.id);
          // At the limit, the unpicked tags are disabled, except in a
          // pick-one category, where tapping another tag swaps.
          const disabled = !isPicked && atLimit && !pickOnlyOne;
          return (
            <li key={tag.id}>
              <button
                type="button"
                aria-pressed={isPicked}
                disabled={disabled}
                onClick={() => toggle(tag.id)}
                className={`w-full rounded border px-4 py-3 text-left disabled:opacity-40 ${
                  isPicked ? "border-2 border-current font-semibold" : "border-current/30"
                }`}
              >
                <span className="block">{tag.name}</span>
                {tag.description && (
                  <span className="mt-1 block text-sm font-normal text-zinc-600 dark:text-zinc-400">
                    {tag.description}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
