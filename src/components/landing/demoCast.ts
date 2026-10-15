// THE MADE-UP PEOPLE IN THE LANDING PAGE DEMO (landing-page-demo, group 1).
//
// NOTHING IN THIS FILE IS REAL. These are invented aliases, invented tags and
// one invented score, written straight into the source. The landing page never
// reads the database, so it can't show a real student, a real alias or an
// email, whoever is looking at it (spec: "Nothing real is shown").
//
// WHY ONE FILE: the animated scene (group 2) and the plain-words list both
// read from here, so the picture and the text can't drift apart.

// The silhouette ids are from the shared set in public/silhouettes. They are
// only used to look at, never matched against anyone.
export type DemoPerson = {
  alias: string;
  silhouetteId: string;
  course: "software" | "business";
};

// Four people drift into the graph. The first two are the pair that links.
export const DEMO_PEOPLE: DemoPerson[] = [
  { alias: "The Midnight Debugger", silhouetteId: "silhouette-01", course: "software" },
  { alias: "The Napkin Strategist", silhouetteId: "silhouette-02", course: "business" },
  { alias: "The Loud Optimist", silhouetteId: "silhouette-03", course: "software" },
  { alias: "The Quiet Planner", silhouetteId: "silhouette-04", course: "business" },
];

// The tags "picked" at the start of the story. Plain words, so the first step
// reads the same with the animation off.
export const DEMO_PICKED_TAGS: string[] = ["Sea captain energy", "Night owl", "Loves a plan"];

// The pair that links, and the made-up score shown on the link.
export const DEMO_MATCH = {
  first: DEMO_PEOPLE[0],
  second: DEMO_PEOPLE[1],
  score: 87,
  // WHY SHORT PHRASES: "Why you match" in the real app lists reasons, not a
  // bare number, and the landing page copies that so the idea is honest.
  reasons: ["You both work late", "One plans, one builds", "Different courses, same energy"],
};

// The four steps of the story, in words. Used by the list on the page and as
// the caption under the scene.
export const HOW_IT_WORKS_STEPS: { title: string; text: string }[] = [
  {
    title: "Pick",
    text: "Choose a few tags that sound like you. No CV, no free text, just a quick pick from lists.",
  },
  {
    title: "Match",
    text: "Everyone in the cohort appears as a silhouette with a made-up name. The closest chemistry glows, with a score and the reasons why.",
  },
  {
    title: "Request",
    text: "Ask someone to connect. They only see your alias until they say yes.",
  },
  {
    title: "Talk",
    text: "When they approve, a conversation opens. Nobody's email is ever shown.",
  },
];

// The first message in the chat bubble at the end of the story. Invented like
// everything else here, and kept in this file so the scene has no words of its
// own that the plain-text list doesn't also cover.
export const DEMO_FIRST_MESSAGE = "Hi! Want to team up?";
