"use client";

// THE GRAPH ITSELF (slice 4, #11, design decisions 3, 4 and 6).
//
// Draws every visible person as a dot and every pair's score as a line, and
// shows a small panel when a dot is tapped.
//
// "use client" makes this a Client Component: it runs in the browser. It has
// to, because the graph library draws on a <canvas> and listens for taps and
// drags, and none of that exists on the server.
//
// THERE ARE NO RULES IN THIS FILE. Who is in your top 5, how thick a line is,
// who is hidden: all of that was decided on the server, in
// src/lib/cohort/graphData.ts, where it is tested. This file only says "if
// this flag is set, draw it this way". Keep it like that, because no test can
// look inside a canvas.
//
// Never import this file directly into a page. Use CohortGraphLoader.tsx,
// which makes sure it only ever loads in the browser.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";

// `import type` brings in only the SHAPE of the data, not the code. That
// matters here: graphData.ts talks to the database, and database code must
// never be sent to a browser. A type-only import disappears when the app is
// built.
import type { GraphLink, GraphNode } from "@/lib/cohort/graphData";
import { SilhouetteStandIn } from "@/lib/cohort/SilhouetteStandIn";

import { courseColourName } from "./graphColours";
import styles from "./graphColours.module.css";

// ---------------------------------------------------------------------------
// Numbers tuned by eye (task 4.4). Change them here, nowhere else.
// ---------------------------------------------------------------------------

// Dot sizes, measured in the graph's own units (they grow when you zoom in).
const NODE_RADIUS = 6;
const VIEWER_NODE_RADIUS = 9;
// How far outside the dot its ring is drawn, and how thick the ring is.
const RING_GAP = 3;
const RING_WIDTH = 2;
// The dash pattern for a glitch match's ring and line: 4 drawn, 3 blank.
const GLITCH_DASH = [4, 3];
// A finger is less exact than a mouse, so the area that counts as "tapping
// this dot" is this much bigger than the dot itself.
const TAP_AREA_EXTRA = 6;

// The lines to your own matches are never drawn thinner than this, so they
// stay visible even when the score happens to be a low one.
const MIN_VIEWER_LINE_WIDTH = 2;

// Alias labels. Yours and your matches' are always shown. Everyone else's
// appear once you have zoomed in this far, because 30 or more labels at once
// would cover the graph.
const LABEL_FONT_SIZE = 12;
// "This far" is measured against the zoom level at which the whole graph
// just fits the canvas: 1.8 means "zoomed in to 1.8 times that".
const SHOW_ALL_LABELS_ZOOMED_IN_BY = 1.8;
// People who don't fit the filters are drawn this faint (0 is invisible, 1 is
// solid).
const DIMMED_OPACITY = 0.2;

// The layout. Every pair of dots is joined by a line that pulls them
// together, and every dot pushes all the others away. A higher score pulls
// harder, so good matches end up close together (brief: "edge strength
// affects pull").
const WEAKEST_PULL = 0.005;
const STRONGEST_PULL = 0.12;
const PUSH_APART = -300;
// How long a line "wants" to be, in the graph's own units: short for the
// best matches, long for the weakest. This is what spreads the graph out
// enough for the dots not to sit on top of each other.
const SHORTEST_LINE = 50;
const LONGEST_LINE = 220;
// The layout is worked out in steps. The first HIDDEN_LAYOUT_STEPS happen
// before anything is drawn, so the graph doesn't appear as a tangle exploding
// outwards. The next MOVING_LAYOUT_STEPS are drawn one by one, which is the
// gentle drifting-into-place you see when the page opens. Then it STOPS.
// WHY IT STOPS: a graph that never settles drains a phone's battery and is
// hard to tap. Pulling a dot starts it moving again for the same number of
// steps, so the others shuffle to make room and then settle.
const HIDDEN_LAYOUT_STEPS = 60;
const MOVING_LAYOUT_STEPS = 180;
// How quickly the movement dies away: 0 would never slow down, 1 stops dead.
// The library's own default is 0.4. A little higher makes the drift calmer
// and less bouncy.
const MOVEMENT_DAMPING = 0.5;
// How long the "zoom to fit" glide takes once the layout has settled, in
// thousandths of a second.
const FIT_GLIDE_TIME = 500;

// The canvas is as wide as its container and this share of the screen's
// height, within these limits (in pixels).
const HEIGHT_SHARE_OF_SCREEN = 0.7;
const MIN_HEIGHT = 320;
const MAX_HEIGHT = 760;
// The canvas is also never much taller than it is wide. The graph is roughly
// as tall as it is wide, so on a phone held upright a taller canvas would be
// mostly empty space to scroll past.
const MAX_HEIGHT_SHARE_OF_WIDTH = 1.2;
// Space left round the graph when it zooms to fit, so labels aren't cut off,
// as a share of the canvas's width. A share, not a fixed number of pixels,
// so a phone doesn't lose a third of its small canvas to padding.
const FIT_PADDING_SHARE_OF_WIDTH = 0.07;

// A canvas narrower than this (in pixels) counts as "phone sized". Lines are
// drawn thinner there: the same thickness that looks fine on a laptop fills
// a small canvas with ink.
const NARROW_CANVAS_WIDTH = 500;
const NARROW_CANVAS_LINE_SCALE = 0.6;

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

// The colour names from graphColours.module.css that the canvas needs. (The
// course colours are looked up through courseColourName().)
const COLOUR_NAMES = [
  "--graph-software",
  "--graph-business",
  "--graph-other-course",
  "--graph-highlight",
  "--graph-glitch",
  "--graph-line",
  "--graph-label",
  "--graph-label-outline",
];

// From a colour's name to its value right now, e.g.
// { "--graph-software": "#2563eb", ... }.
type Colours = Record<string, string>;

// A canvas can't use CSS variables, so this asks the browser what each one
// currently works out to on the given element. The answer depends on whether
// the device is in light or dark mode.
function readColours(element: HTMLElement): Colours {
  const computed = getComputedStyle(element);
  const colours: Colours = {};
  for (const name of COLOUR_NAMES) {
    colours[name] = computed.getPropertyValue(name).trim();
  }
  return colours;
}

// Turns "#2563eb" and 0.3 into "rgba(37, 99, 235, 0.3)": the same colour,
// partly see-through. The graph library takes a line's colour as text, so
// this is how a line is made faint.
function withOpacity(hexColour: string, opacity: number): string {
  // "#2563eb" is three pairs of hexadecimal digits: red, green, blue.
  const red = parseInt(hexColour.slice(1, 3), 16);
  const green = parseInt(hexColour.slice(3, 5), 16);
  const blue = parseInt(hexColour.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// The library adds its own fields to each node as it lays the graph out,
// most importantly x and y (where the dot ended up). NodeObject<GraphNode> is
// "our node, plus whatever the library added".
type DrawnNode = NodeObject<GraphNode>;
type DrawnLink = LinkObject<GraphNode, GraphLink>;

type CohortGraphProps = {
  nodes: GraphNode[];
  links: GraphLink[];
};

// Zooms so the whole graph is in view, and returns the zoom level before the
// move, or null if the graph isn't on screen yet. A plain function outside
// the component, so every place that needs it can call it.
//
// `glideTime` is how long the move takes, in thousandths of a second. 0 means
// "jump there now".
function fitGraphToCanvas(
  graph: ForceGraphMethods<DrawnNode, DrawnLink> | undefined,
  canvasWidth: number,
  glideTime: number,
): number | null {
  if (!graph) return null;
  graph.zoomToFit(glideTime, canvasWidth * FIT_PADDING_SHARE_OF_WIDTH);
  return graph.zoom();
}

// ---------------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------------

export default function CohortGraph({ nodes, links }: CohortGraphProps) {
  // The box the canvas sits in. We measure it to size the canvas, and read
  // the colours from it.
  const containerRef = useRef<HTMLDivElement>(null);
  // A handle on the graph itself, for the few things that are commands
  // rather than settings ("zoom to fit now").
  const graphRef = useRef<ForceGraphMethods<DrawnNode, DrawnLink> | undefined>(undefined);
  // The zoom level at which the whole graph just fits the canvas. Remembered
  // so the drawing code can tell "zoomed in" from "showing everything". A
  // ref, not state, because changing it shouldn't make React redraw anything.
  const fittedZoomRef = useRef<number | null>(null);
  // Whether the opening layout has settled yet. After that, the view is left
  // wherever the person has put it: pulling a dot must not make the whole
  // graph jump back to "fit everything".
  const hasSettledRef = useRef(false);

  // The library CHANGES the node and link objects it is given (it writes x
  // and y onto them). The props came from the server and shouldn't be
  // changed, so we make our own copy once, when the component first appears,
  // and hand the library that. The function form of useState means "run this
  // only the first time".
  const [graphData] = useState(() => ({
    nodes: nodes.map((node) => ({ ...node })),
    links: links.map((link) => ({ ...link })),
  }));

  // The canvas size in pixels. Null until we have measured the container,
  // which can only happen once the page is on screen.
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  // Null until read from the page, for the same reason.
  const [colours, setColours] = useState<Colours | null>(null);
  // The id (alias address) of the dot whose panel is open, or null.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // --- Measure the container, and measure again when it changes ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function measure() {
      if (!container) return;
      const width = container.clientWidth;
      // The smallest of: a share of the screen's height, a little more than
      // the canvas's own width, and the overall maximum. Then never less
      // than the minimum.
      const height = Math.min(
        Math.round(window.innerHeight * HEIGHT_SHARE_OF_SCREEN),
        Math.round(width * MAX_HEIGHT_SHARE_OF_WIDTH),
        MAX_HEIGHT,
      );
      setSize({ width, height: Math.max(MIN_HEIGHT, height) });
    }
    measure();

    // A ResizeObserver calls us whenever the container's size changes: the
    // phone is rotated, or the window is resized. The window listener covers
    // a change in height only, which doesn't change the container's width.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener("resize", measure);

    // The function returned from an effect is the tidy-up: React runs it
    // when the component goes away, so nothing keeps listening afterwards.
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // --- Read the colours, and read them again if the device switches between
  // light and dark mode while the page is open ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const readNow = () => setColours(readColours(container));
    readNow();

    const darkMode = window.matchMedia("(prefers-color-scheme: dark)");
    darkMode.addEventListener("change", readNow);
    return () => darkMode.removeEventListener("change", readNow);
  }, []);

  // Both are needed before the library can draw anything.
  const isReady = size !== null && colours !== null;

  // --- Set how hard lines pull and dots push ---
  //
  // These are "forces" inside the library's layout engine (d3-force), and
  // they can only be reached through the graph handle, so this runs once the
  // graph is on screen.
  useEffect(() => {
    const graph = graphRef.current;
    if (!isReady || !graph) return;

    // Each line pulls its two people together, harder for a higher score.
    graph
      .d3Force("link")
      ?.strength(
        (link: DrawnLink) => WEAKEST_PULL + link.strength * (STRONGEST_PULL - WEAKEST_PULL),
      );
    graph
      .d3Force("link")
      ?.distance(
        (link: DrawnLink) => LONGEST_LINE - link.strength * (LONGEST_LINE - SHORTEST_LINE),
      );
    // Every dot pushes every other dot away, which stops them piling up.
    graph.d3Force("charge")?.strength(PUSH_APART);
    // Start the layout again so it uses the settings above.
    graph.d3ReheatSimulation();
  }, [isReady]);

  // --- Keep the whole graph in view when the canvas changes size ---
  useEffect(() => {
    if (!size) return;
    fittedZoomRef.current = fitGraphToCanvas(graphRef.current, size.width, 0);
  }, [size]);

  // ---------------------------------------------------------------------------
  // Drawing. The library calls these for every dot and line, many times.
  // ---------------------------------------------------------------------------

  // Draws one dot, its ring and (sometimes) its alias.
  //
  // `context` is the canvas's drawing tool. `zoom` is how far the view is
  // zoomed in: 1 is normal, 2 is twice as big.
  function drawNode(node: DrawnNode, context: CanvasRenderingContext2D, zoom: number) {
    // The library hasn't placed this dot yet. Nothing to draw.
    if (!colours || node.x === undefined || node.y === undefined) return;

    const radius = node.isViewer ? VIEWER_NODE_RADIUS : NODE_RADIUS;
    const isSelected = node.id === selectedId;

    // Dim people who don't fit the filters. globalAlpha makes everything
    // drawn after it partly see-through, until it is set back.
    context.globalAlpha = node.matchesFilter ? 1 : DIMMED_OPACITY;

    // The dot, in its course's colour.
    context.beginPath();
    context.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    context.fillStyle = colours[courseColourName(node.courseId)];
    context.fill();

    // The ring. At most one applies. Your own dot gets a plain ring, a top 5
    // match a highlight ring, and your glitch match a DASHED ring in its own
    // colour, so it can be told apart without relying on colour.
    let ringColour: string | null = null;
    let ringIsDashed = false;
    if (node.isViewer) {
      ringColour = colours["--graph-line"];
    } else if (node.isGlitch) {
      ringColour = colours["--graph-glitch"];
      ringIsDashed = true;
    } else if (node.isTopFive) {
      ringColour = colours["--graph-highlight"];
    } else if (isSelected) {
      ringColour = colours["--graph-line"];
    }
    if (ringColour) {
      context.beginPath();
      context.arc(node.x, node.y, radius + RING_GAP, 0, 2 * Math.PI);
      context.strokeStyle = ringColour;
      context.lineWidth = RING_WIDTH;
      context.setLineDash(ringIsDashed ? GLITCH_DASH : []);
      context.stroke();
      // Put the dash setting back, or the next thing drawn would be dashed.
      context.setLineDash([]);
    }

    // The alias, under the dot.
    const showLabel =
      node.isViewer ||
      node.isTopFive ||
      node.isGlitch ||
      isSelected ||
      (fittedZoomRef.current !== null &&
        zoom > fittedZoomRef.current * SHOW_ALL_LABELS_ZOOMED_IN_BY);
    if (showLabel) {
      // Dividing by the zoom keeps the text the same size on screen however
      // far in or out you are. Without it, zooming in would make it huge.
      const fontSize = LABEL_FONT_SIZE / zoom;
      const text = node.isViewer ? "You" : node.alias;
      const textY = node.y + radius + RING_GAP + fontSize;

      context.font = `${node.isViewer ? "bold " : ""}${fontSize}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      // First a thick outline in the page's background colour, then the text
      // on top. The outline is what keeps a label readable where it crosses
      // lines.
      context.lineWidth = 3 / zoom;
      context.strokeStyle = colours["--graph-label-outline"];
      context.strokeText(text, node.x, textY);
      context.fillStyle = colours["--graph-label"];
      context.fillText(text, node.x, textY);
    }

    context.globalAlpha = 1;
  }

  // Tells the library which area counts as "on this dot" for taps. It is a
  // little bigger than the dot, to suit fingers. The library works out what
  // was tapped by painting each dot in a secret colour of its own, which is
  // why it hands us `paintColour` to use.
  function paintTapArea(node: DrawnNode, paintColour: string, context: CanvasRenderingContext2D) {
    if (node.x === undefined || node.y === undefined) return;
    const radius = node.isViewer ? VIEWER_NODE_RADIUS : NODE_RADIUS;

    context.beginPath();
    context.arc(node.x, node.y, radius + TAP_AREA_EXTRA, 0, 2 * Math.PI);
    context.fillStyle = paintColour;
    context.fill();
  }

  // A line to one of your matches is the highlight colour at full strength.
  // Every other line is the plain colour, as faint as its score says.
  function linkColour(link: DrawnLink): string {
    if (!colours) return "transparent";
    if (link.isViewersMatch) {
      return colours["--graph-highlight"];
    }
    return withOpacity(colours["--graph-line"], link.opacity);
  }

  function linkWidth(link: DrawnLink): number {
    // Thinner lines on a phone-sized canvas (see NARROW_CANVAS_WIDTH).
    const isNarrow = size !== null && size.width < NARROW_CANVAS_WIDTH;
    const scale = isNarrow ? NARROW_CANVAS_LINE_SCALE : 1;

    if (link.isViewersMatch) {
      return Math.max(link.width, MIN_VIEWER_LINE_WIDTH) * scale;
    }
    return link.width * scale;
  }

  // The person whose panel is open. Looked up in the props, which never
  // change, by the id we stored when their dot was tapped.
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null;

  return (
    // `relative` lets the panel be placed on top of the canvas, at its
    // bottom edge. The colours class is what readColours() reads from.
    <div ref={containerRef} className={`${styles.graphColours} relative w-full`}>
      {isReady ? (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={size.width}
          height={size.height}
          // --- Dots ---
          // "replace" means: don't draw your own dot, call drawNode instead.
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={paintTapArea}
          // No floating tooltip: the panel does that job, and tooltips need
          // a mouse.
          nodeLabel=""
          // --- Lines ---
          linkColor={linkColour}
          linkWidth={linkWidth}
          // A glitch match is dashed (brief: it differs by style, not by
          // thickness). null means a solid line.
          linkLineDash={(link) => (link.isGlitch ? GLITCH_DASH : null)}
          // --- Layout: drift into place, then stop (see the layout numbers
          // at the top of this file) ---
          warmupTicks={HIDDEN_LAYOUT_STEPS}
          cooldownTicks={MOVING_LAYOUT_STEPS}
          d3VelocityDecay={MOVEMENT_DAMPING}
          // Runs after every step while the graph is moving. Until the
          // opening layout has settled, keep the whole graph in view, so it
          // is never half off the canvas while it drifts.
          onEngineTick={() => {
            if (!hasSettledRef.current) {
              fittedZoomRef.current = fitGraphToCanvas(graphRef.current, size.width, 0);
            }
          }}
          // Runs each time the movement stops. The FIRST time, glide to a
          // final fit. After that do nothing (see hasSettledRef).
          onEngineStop={() => {
            if (!hasSettledRef.current) {
              hasSettledRef.current = true;
              fittedZoomRef.current = fitGraphToCanvas(
                graphRef.current,
                size.width,
                FIT_GLIDE_TIME,
              );
            }
          }}
          // --- Touch and mouse ---
          // A dot can be pulled around: the others shuffle out of its way and
          // it springs back when let go. A quick tap or click on a dot, with
          // no pulling, opens the panel instead. Dragging the background
          // moves the view, and pinching or the scroll wheel zooms: the
          // library does all of this by itself.
          enableNodeDrag={true}
          onNodeClick={(node) => setSelectedId(String(node.id))}
          // Tapping empty space closes the panel.
          onBackgroundClick={() => setSelectedId(null)}
        />
      ) : (
        // Shown for the instant before the container has been measured.
        <p className="p-4">Loading the graph…</p>
      )}

      {selectedNode && (
        <SelectedPersonPanel node={selectedNode} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The panel
// ---------------------------------------------------------------------------

type SelectedPersonPanelProps = {
  node: GraphNode;
  onClose: () => void;
};

// The small panel shown when a dot is tapped (design decision 6).
//
// WHY A PANEL AND NOT STRAIGHT TO THE PROFILE: on a touch screen people tap
// while trying to drag. A panel is cheap to dismiss. Jumping to another page
// would lose your place in the graph.
function SelectedPersonPanel({ node, onClose }: SelectedPersonPanelProps) {
  return (
    <div
      // Sits over the bottom of the canvas. `bg-background` gives it the
      // page's own background colour so the graph doesn't show through.
      className="bg-background absolute inset-x-2 bottom-2 rounded border border-current/30 p-3 shadow-lg sm:right-auto sm:w-80"
      // Screen readers announce the panel's contents when it appears.
      role="status"
      data-testid="graph-panel"
    >
      <div className="flex items-start gap-3">
        <SilhouetteStandIn silhouette={node.silhouette} size={48} />

        <div className="min-w-0 flex-1">
          <p className="font-semibold">{node.alias}</p>
          <p className="text-sm">{node.courseName ?? "No course"}</p>

          {/* Exactly one of these lines, depending on who was tapped. */}
          {node.isViewer ? (
            <p className="mt-1 text-sm">This is you.</p>
          ) : (
            <p className="mt-1 text-sm">
              {node.scoreWithViewer === null
                ? "No score with you yet"
                : `Score with you: ${node.scoreWithViewer}`}
              {node.isTopFive && " · One of your top 5"}
              {node.isGlitch && " · Your glitch match"}
            </p>
          )}

          <p className="mt-2">
            {/* The node's id IS its profile address (see aliasAddress.ts). */}
            <Link href={`/people/${node.id}`} className="underline underline-offset-4">
              View profile
            </Link>
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded border border-current/30 px-2 py-1 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}
