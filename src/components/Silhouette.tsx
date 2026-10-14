// A person's silhouette picture (slice 2, #9, design decision 7).
//
// The pictures are slice 10's designs (#45, design decision 5): one SVG file
// per silhouette in public/silhouettes/. Each file carries its own light and
// dark colours, because an <img> can't read the page's CSS, so a plain <img>
// is all that's needed here.
//
// Unlike SilhouetteStandIn (slices 4 and 7, which always show the alias next
// to the picture and so skip it for screen readers), this one has alt text:
// the silhouette picker shows pictures, and a screen reader needs to say
// which one ("Antennae").
//
// Imports nothing from the server, so browser components can use it too.

import { isSilhouetteId, silhouetteLabel, silhouetteUrl, SILHOUETTE_IDS } from "@/lib/profile/silhouettes";

type SilhouetteProps = {
  // e.g. "silhouette-03" (what Profile.silhouette stores)
  silhouetteId: string;
  // Width and height in pixels. The pictures are square.
  size?: number;
  // true when the name is already written next to the picture (as in the
  // picker), so a screen reader doesn't read it twice.
  decorative?: boolean;
};

export function Silhouette({ silhouetteId, size = 64, decorative = false }: SilhouetteProps) {
  // An unknown id (old or made-up data) shows the first picture rather than
  // a broken image.
  const id = isSilhouetteId(silhouetteId) ? silhouetteId : SILHOUETTE_IDS[0];

  return (
    // A plain <img>, not Next.js's <Image>: these are tiny static SVG files
    // the browser caches as they are, so there's nothing for <Image> to
    // optimise. (The same choice as SilhouetteStandIn.)
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={silhouetteUrl(id)}
      width={size}
      height={size}
      alt={decorative ? "" : silhouetteLabel(id)}
      // Lets a test, or anyone in dev tools, see which silhouette this is.
      data-silhouette={silhouetteId}
      className="shrink-0"
      draggable={false}
    />
  );
}
