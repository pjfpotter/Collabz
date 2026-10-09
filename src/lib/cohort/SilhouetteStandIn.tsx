// STAND-IN for track 2 (#9). Real version: silhouetteUrl(id) and the 12
// pictures in public/silhouettes/.
// Join-up: replace the <svg> with an <img> whose src is silhouetteUrl(id).
//
// This is one of the six stand-ins listed in standIns.ts. It has a file of
// its own because it is the only one a BROWSER component needs: standIns.ts
// talks to the database, so it can only be imported by server code. This
// file imports nothing, so it can be used anywhere.

type SilhouetteStandInProps = {
  // The person's silhouette id, e.g. "silhouette-07". Not used to choose a
  // picture yet (there is only one), but taken now so the pages don't change
  // when the real pictures arrive.
  silhouette: string;
  // Width and height in pixels. The picture is square.
  size?: number;
};

// Draws ONE neutral head-and-shoulders shape for everybody.
//
// - It is an inline SVG (a picture written as shapes), so there is no image
//   file to load.
// - `fill="currentColor"` makes it take the colour of the text around it, so
//   it works in light and dark mode with no extra code.
// - `aria-hidden` tells screen readers to skip it. It is decoration: the
//   alias is always written next to it, and everyone's picture is the same.
export function SilhouetteStandIn({ silhouette, size = 48 }: SilhouetteStandInProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="currentColor"
      aria-hidden="true"
      // Lets a test, or anyone looking in dev tools, see which silhouette
      // this person chose even though the picture doesn't show it yet.
      data-silhouette={silhouette}
    >
      {/* The head. */}
      <circle cx="24" cy="17" r="9" />
      {/* The shoulders: a curve from bottom-left, up over, to bottom-right. */}
      <path d="M6 44c0-10 8-16 18-16s18 6 18 16z" />
    </svg>
  );
}
