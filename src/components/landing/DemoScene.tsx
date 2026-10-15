// THE DEMO PICTURE (landing-page-demo, group 2, task 2.1).
//
// One inline SVG that tells the whole story in its FINISHED state:
// tags picked -> people in a graph -> two of them linked with a score and
// reasons -> Approve -> a conversation open.
//
// WHY THE FINISHED STATE: design decision 2. Everything here is drawn the way
// it looks at the END of the story. Task 2.2 adds keyframes that start each
// piece hidden and run it up to this state. So with no CSS, or with reduced
// motion (which squashes animations to nothing), a visitor sees this complete
// picture and nothing is ever missing.
//
// WHY ONE aria-label (design decision 3): the SVG is role="img" with a single
// description, and every shape inside is aria-hidden, so a screen reader says
// one sentence instead of reading twenty pieces of decoration. The same story
// is also written out in HowItWorks.
//
// All words and people come from demoCast.ts: nothing here is real, and the
// component reads nothing from the database.
//
// The classNames starting "demo-" are the hooks landing.css hangs the
// keyframes on (task 2.2). The timeline table is at the top of that file.

import "./landing.css";
import {
  DEMO_FIRST_MESSAGE,
  DEMO_MATCH,
  DEMO_PEOPLE,
  DEMO_PICKED_TAGS,
  type DemoPerson,
} from "./demoCast";
import { silhouetteUrl } from "@/lib/profile/silhouettes";

// ---------------------------------------------------------------------------
// Layout. The drawing is 480 x 540 "SVG units"; the browser scales it to
// whatever width is available, so these numbers are not pixels. Portrait on
// purpose: a wide picture would shrink its text to nothing on a 375px phone.
// ---------------------------------------------------------------------------
const WIDTH = 480;
const HEIGHT = 584;
const FONT_SIZE = 14;
const PILL_HEIGHT = 28;

// Where each of the four people sits. The first two (the linked pair) are on
// the same row so the link is a straight horizontal line.
const PERSON_POSITIONS = [
  { x: 110, y: 190 }, // DEMO_PEOPLE[0]: left of the pair
  { x: 370, y: 190 }, // DEMO_PEOPLE[1]: right of the pair
  { x: 240, y: 96 }, // DEMO_PEOPLE[2]: above
  { x: 240, y: 296 }, // DEMO_PEOPLE[3]: below
];
const PERSON_RADIUS = 34;

// A pill's width has to be set by hand in SVG (there is no auto-sizing like
// in HTML). This estimates it from the number of letters: about 7.6 units per
// letter at 14 units of font size, plus padding. WHY AN ESTIMATE: measuring
// real text needs the browser, and this must work as plain server-drawn HTML.
function pillWidth(text: string): number {
  return Math.round(text.length * 7.6 + 24);
}

// A rounded label with centred text. Used for tags, aliases, reasons and the
// score so they all look like one family.
function Pill({
  text,
  x,
  y,
  className,
  strong = false,
}: {
  text: string;
  x: number; // centre of the pill
  y: number; // centre of the pill
  className?: string;
  strong?: boolean;
}) {
  const width = pillWidth(text);
  return (
    <g className={className}>
      <rect
        x={x - width / 2}
        y={y - PILL_HEIGHT / 2}
        width={width}
        height={PILL_HEIGHT}
        rx={PILL_HEIGHT / 2}
        className="fill-surface stroke-line-strong"
        strokeWidth={1.5}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={FONT_SIZE}
        fontWeight={strong ? 700 : 500}
        className="fill-foreground"
      >
        {text}
      </text>
    </g>
  );
}

// One person: a picture in a frame, with the alias underneath.
// The frame's SHAPE says the course (circle = software, rounded square =
// business) and its colour backs that up, so colour is never the only signal.
function Person({ person, x, y }: { person: DemoPerson; x: number; y: number }) {
  const isSoftware = person.course === "software";
  const ringClass = isSoftware ? "stroke-software" : "stroke-business";
  const pictureSize = 56;

  return (
    <g className="demo-person">
      {isSoftware ? (
        <circle cx={x} cy={y} r={PERSON_RADIUS} className={`fill-surface-2 ${ringClass}`} strokeWidth={3} />
      ) : (
        <rect
          x={x - PERSON_RADIUS}
          y={y - PERSON_RADIUS}
          width={PERSON_RADIUS * 2}
          height={PERSON_RADIUS * 2}
          rx={14}
          className={`fill-surface-2 ${ringClass}`}
          strokeWidth={3}
        />
      )}
      {/* <image> inside an SVG can load the silhouette file directly. The file
          carries its own light and dark colours (see Silhouette.tsx). */}
      <image
        href={silhouetteUrl(person.silhouetteId)}
        x={x - pictureSize / 2}
        y={y - pictureSize / 2}
        width={pictureSize}
        height={pictureSize}
      />
      <Pill text={person.alias} x={x} y={y + PERSON_RADIUS + 22} />
    </g>
  );
}

export function DemoScene() {
  const [first, second] = [DEMO_PEOPLE[0], DEMO_PEOPLE[1]];
  const firstAt = PERSON_POSITIONS[0];
  const secondAt = PERSON_POSITIONS[1];
  const midX = (firstAt.x + secondAt.x) / 2;
  const midY = firstAt.y;

  // The single description a screen reader gets (design decision 3).
  const description =
    `A made-up example of Collabz. ${first.alias} picks tags: ` +
    `${DEMO_PICKED_TAGS.join(", ")}. They match with ${second.alias} ` +
    `with a score of ${DEMO_MATCH.score}, because: ${DEMO_MATCH.reasons.join("; ")}. ` +
    `They approve the request and a conversation opens.`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={description}
      // w-full + h-auto: fill the column and keep the proportions, so there
      // is never sideways scroll. max-w stops it growing huge on desktop.
      className="mx-auto h-auto w-full max-w-md"
      data-testid="landing-demo"
    >
      {/* Everything inside is decoration for the label above. */}
      <g aria-hidden="true">
        {/* Step 1: PICK. The tags, in a row along the top. */}
        <g className="demo-tags">
          {DEMO_PICKED_TAGS.map((tag, index) => {
            // Spread the three pills evenly. Widths differ, so centre each
            // one in its own third of the picture.
            const centreX = (WIDTH / DEMO_PICKED_TAGS.length) * (index + 0.5);
            return <Pill key={tag} text={tag} x={centreX} y={28} />;
          })}
        </g>

        {/* Step 2: MATCH. People first, link on top. */}
        <g className="demo-people">
          {DEMO_PEOPLE.map((person, index) => (
            <Person
              key={person.alias}
              person={person}
              x={PERSON_POSITIONS[index].x}
              y={PERSON_POSITIONS[index].y}
            />
          ))}
        </g>

        {/* The link between the pair. Drawn after the people but it only
            spans the gap between the two frames. */}
        <line
          className="demo-link stroke-primary-text"
          x1={firstAt.x + PERSON_RADIUS}
          y1={midY}
          x2={secondAt.x - PERSON_RADIUS}
          y2={midY}
          strokeWidth={4}
          strokeLinecap="round"
          // Counts the whole line as length 1, so landing.css can "draw" it
          // with a dash offset without knowing the real length in SVG units.
          pathLength={1}
        />
        <Pill text={String(DEMO_MATCH.score)} x={midX} y={midY} className="demo-score" strong />

        {/* Why they match. Three short reasons, stacked and centred. */}
        <g className="demo-reasons">
          <text
            x={WIDTH / 2}
            y={392}
            textAnchor="middle"
            fontSize={FONT_SIZE}
            fontWeight={700}
            className="fill-muted"
          >
            Why you match
          </text>
          {DEMO_MATCH.reasons.map((reason, index) => (
            <Pill key={reason} text={reason} x={WIDTH / 2} y={428 + index * 36} />
          ))}
        </g>

        {/* Steps 3 and 4: REQUEST then TALK. An Approve button on the left,
            the conversation bubble that opens on the right. */}
        <g className="demo-approve">
          <rect
            x={24}
            y={528}
            width={132}
            height={36}
            rx={10}
            className="fill-primary"
          />
          <text
            x={90}
            y={546}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={FONT_SIZE + 1}
            fontWeight={700}
            className="fill-on-primary"
          >
            Approve
          </text>
        </g>

        <g className="demo-chat">
          <rect
            x={176}
            y={528}
            width={280}
            height={36}
            rx={18}
            className="fill-surface-2 stroke-line-strong"
            strokeWidth={1.5}
          />
          <text
            x={316}
            y={546}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={FONT_SIZE}
            className="fill-foreground"
          >
            {DEMO_FIRST_MESSAGE}
          </text>
        </g>
      </g>
    </svg>
  );
}
