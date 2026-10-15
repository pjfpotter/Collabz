// The 12 silhouettes a person can pick as their picture (slice 2, #9,
// design decision 7).
//
// The pictures themselves are files in public/silhouettes/. This file is the
// list of them: each one's id (what Profile.silhouette stores) and a short
// label, used as the picture's alt text for screen readers.
//
// WHY THE LIST IS IN CODE AND NOT IN THE DATABASE: silhouettes are files that
// ship with the app. Admins can't upload new ones, so a table could only ever
// disagree with the folder.
//
// This file imports nothing, so both server and browser code can use it.

export type SilhouetteOption = {
  id: string; // e.g. "silhouette-03"
  label: string; // e.g. "Long hair"
};

// In the same order as the files (01 to 12), which is also the order they're
// shown in on the silhouette step.
export const SILHOUETTES: SilhouetteOption[] = [
  // The names slice 10 (#45, design decision 5) gave its twelve designs,
  // in file order.
  { id: "silhouette-01", label: "Sprout" },
  { id: "silhouette-02", label: "Capped" },
  { id: "silhouette-03", label: "Antennae" },
  { id: "silhouette-04", label: "Specs" },
  { id: "silhouette-05", label: "Beanie" },
  { id: "silhouette-06", label: "Curls" },
  { id: "silhouette-07", label: "Bun" },
  { id: "silhouette-08", label: "Spiky" },
  { id: "silhouette-09", label: "Hooded" },
  { id: "silhouette-10", label: "Headphones" },
  { id: "silhouette-11", label: "Halo" },
  { id: "silhouette-12", label: "Wide hat" },
];

// Just the ids, for quick "is this one of ours?" checks.
export const SILHOUETTE_IDS: string[] = SILHOUETTES.map((silhouette) => silhouette.id);

export function isSilhouetteId(id: string): boolean {
  return SILHOUETTE_IDS.includes(id);
}

// Where the browser finds a silhouette's picture, e.g.
//   silhouetteUrl("silhouette-03") -> "/silhouettes/silhouette-03.svg"
// Files in public/ are served from the site's root, so "/silhouettes/..."
// is public/silhouettes/... on disk.
export function silhouetteUrl(id: string): string {
  return `/silhouettes/${id}.svg`;
}

// The label for alt text. An id we don't know (say, from old data) still
// gets readable text rather than "undefined".
export function silhouetteLabel(id: string): string {
  const found = SILHOUETTES.find((silhouette) => silhouette.id === id);
  return found ? found.label : "Silhouette";
}
