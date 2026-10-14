// The silhouette picture shown for a person, everywhere in the app.
//
// Slice 10 (#45, design decision 5) replaced the single grey head-and-
// shoulders with the twelve designed silhouettes. They are image files in
// public/silhouettes/silhouette-01.svg ... silhouette-12.svg, exactly where
// slice 2's approved design (#9, decision 7) says they go, so slice 2's
// silhouetteUrl(id) helper and its picker can use the same files unchanged.
//
// This component keeps its name and its two props, so no page that uses it
// changed. It is still listed with the other stand-ins in standIns.ts: when
// slice 2 lands, the <img> below can use its silhouetteUrl(id) helper instead
// of building the address here.
//
// It has a file of its own, and imports nothing, because it is the only one
// of the stand-ins a BROWSER component needs: standIns.ts talks to the
// database, so it can only be imported by server code.

type SilhouetteStandInProps = {
  // The person's silhouette id, e.g. "silhouette-07".
  silhouette: string;
  // Width and height in pixels. The picture is square.
  size?: number;
};

// The ids the files exist for. Anything else (an old or made-up value) falls
// back to the first picture, so a broken id can never show a broken image.
const KNOWN_SILHOUETTE = /^silhouette-(0[1-9]|1[0-2])$/;
const FALLBACK_SILHOUETTE = "silhouette-01";

export function SilhouetteStandIn({ silhouette, size = 48 }: SilhouetteStandInProps) {
  const id = KNOWN_SILHOUETTE.test(silhouette) ? silhouette : FALLBACK_SILHOUETTE;

  return (
    // A plain <img>, not Next.js's <Image>: these are tiny static SVG files
    // that the browser can cache as they are, so there is nothing for
    // <Image> to optimise. The picture's colours live inside the SVG file
    // (light and dark), because an <img> can't read the page's CSS.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/silhouettes/${id}.svg`}
      width={size}
      height={size}
      // alt="" tells screen readers to skip it: it is decoration, and the
      // alias is always written next to it.
      alt=""
      // Lets a test, or anyone looking in dev tools, see which silhouette
      // this person chose.
      data-silhouette={silhouette}
      // Never squashed by a flex row, and not draggable like a photo.
      className="shrink-0"
      draggable={false}
    />
  );
}
