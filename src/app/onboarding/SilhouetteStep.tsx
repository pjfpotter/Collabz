"use client";
// The last onboarding step: pick exactly one of the 12 silhouettes, shown as
// pictures in a grid (slice 2, #9, design decision 7).
//
// Each picture is a toggle button, like the tags in PickStep. Tapping
// another picture swaps the pick.

import { Silhouette } from "@/components/Silhouette";
import { SILHOUETTES } from "@/lib/profile/silhouettes";

type SilhouetteStepProps = {
  picked: string | null;
  onChange: (silhouetteId: string) => void;
};

export function SilhouetteStep({ picked, onChange }: SilhouetteStepProps) {
  return (
    <div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Pick exactly 1.</p>
      {/* 3 across on a phone, 4 on a wider screen. */}
      <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {SILHOUETTES.map((silhouette) => {
          const isPicked = picked === silhouette.id;
          return (
            <li key={silhouette.id}>
              <button
                type="button"
                aria-pressed={isPicked}
                // The name under the picture is read out as the button's name.
                onClick={() => onChange(silhouette.id)}
                className={`flex w-full flex-col items-center gap-1 rounded border p-3 ${
                  isPicked ? "border-2 border-current" : "border-current/30"
                }`}
                data-testid={`pick-${silhouette.id}`}
              >
                <Silhouette silhouetteId={silhouette.id} size={56} decorative />
                <span className="text-xs">{silhouette.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
