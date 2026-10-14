// ===========================================================================
// STAND-IN FOR SLICE 2 (#9 design decision 7). REPLACE WHEN SLICE 2 LANDS.
// ===========================================================================
//
// Slice 2 adds 12 silhouette pictures (public/silhouettes/*.svg). Until then
// this draws a plain circle with the silhouette's number in it, so the
// account page and the edit screen can show which one someone has.
// Listed with the other stand-ins in ./standIns.ts.
//
// Owner: slice 7 (#14), until slice 2 replaces it.

export function SilhouettePlaceholder({ silhouette, size = 64 }: { silhouette: string; size?: number }) {
  // "silhouette-03" -> "3"
  const number = Number(silhouette.replace("silhouette-", "")) || "?";

  return (
    <span
      // role="img" with a label, so a screen reader says what it stands for.
      role="img"
      aria-label={`Silhouette ${number}`}
      className="inline-flex shrink-0 items-center justify-center rounded-full border-2 border-current/40 font-semibold"
      style={{ width: size, height: size }}
      data-testid="silhouette-placeholder"
    >
      {number}
    </span>
  );
}
