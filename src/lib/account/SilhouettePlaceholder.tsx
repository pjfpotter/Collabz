// ===========================================================================
// STAND-IN FOR SLICE 2 (#9 design decision 7). REPLACE WHEN SLICE 2 LANDS.
// ===========================================================================
//
// Slice 10 (#45) drew the twelve silhouette pictures (public/silhouettes/),
// so this now shows the person's real picture. It still wraps it in a
// labelled image ("Silhouette 3") so the account page and its tests have a
// name for it. Listed with the other stand-ins in ./standIns.ts.
//
// Owner: slice 7 (#14), until slice 2 replaces it.

import { SilhouetteStandIn } from "@/lib/cohort/SilhouetteStandIn";

export function SilhouettePlaceholder({ silhouette, size = 64 }: { silhouette: string; size?: number }) {
  // "silhouette-03" -> "3"
  const number = Number(silhouette.replace("silhouette-", "")) || "?";

  return (
    <span
      // role="img" with a label, so a screen reader says what it stands for.
      role="img"
      aria-label={`Silhouette ${number}`}
      className="inline-flex shrink-0"
      data-testid="silhouette-placeholder"
    >
      <SilhouetteStandIn silhouette={silhouette} size={size} />
    </span>
  );
}
