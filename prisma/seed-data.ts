// The starting content of the tag catalogue: 5 categories x 12 tags, and the
// 2 courses. prisma/seed.ts reads this and inserts any rows that are missing.
//
// Why this isn't "hard-coding tags in the app": the app never imports this
// file. It's only the first input for the database, and the app always reads
// from the database (design decision 5). After the first seed, the database
// is the source of truth: editing a name here will NOT change an existing row,
// because the seed only adds rows that are missing.
//
// Names and descriptions are copied word for word from collabz-mvp-brief.md,
// in the brief's order. The order of each list here becomes the `order` column
// (first = 1), so keep the lists in display order.
//
// Ids: readable and permanent. A category id is its name in lowercase with
// dashes; a tag id is "<category id>-<short name>". Never change an id once
// it has been seeded: other tables will point at it.

// The shape of one tag in this file. `order` and `categoryId` are filled in
// by seed.ts from the tag's position and parent category.
export type SeedTag = {
  id: string;
  name: string;
  description: string;
};

export type SeedCategory = {
  id: string;
  name: string;
  // How many tags a person picks in this category during onboarding.
  // "Pick up to 4" has a minimum of 1 (Patrick's decision, 1 Oct 2026),
  // so every profile has at least one Quality and one Seeking tag to score.
  pickMin: number;
  pickMax: number;
  tags: SeedTag[];
};

export type SeedCourse = {
  id: string;
  name: string;
};

export const seedCategories: SeedCategory[] = [
  {
    id: "hero-story",
    name: "Hero Story",
    pickMin: 1, // brief: "pick 1"
    pickMax: 1,
    tags: [
      {
        id: "hero-story-brilliant-graduate",
        name: "The Brilliant Graduate",
        description:
          "Not yet crushed. Convinced the world is still theirs to take.",
      },
      {
        id: "hero-story-burnt-out-prodigy",
        name: "The Burnt-Out Prodigy",
        description:
          "Was gifted once. Is tired now. Wants the fire back, not the label.",
      },
      {
        id: "hero-story-late-bloomer",
        name: "The Late Bloomer",
        description:
          "Took the scenic route. Arrived exactly when they needed to.",
      },
      {
        id: "hero-story-reinventor",
        name: "The Reinventor",
        description:
          "Burned the old career to the ground. Building something true from the ash.",
      },
      {
        id: "hero-story-corporate-escapee",
        name: "The Corporate Escapee",
        description:
          "Ten years in the machine. Remembers, faintly, that they used to make things.",
      },
      {
        id: "hero-story-eternal-apprentice",
        name: "The Eternal Apprentice",
        description:
          "Still learning, on purpose, forever. Suspicious of anyone who claims to be finished.",
      },
      {
        id: "hero-story-dreamer-not-started",
        name: "The Dreamer Who Hasn't Started",
        description:
          "Has the idea. Has always had the idea. Needs a reason to begin.",
      },
      {
        id: "hero-story-serial-starter",
        name: "The Serial Starter",
        description:
          "Twelve brilliant beginnings. Zero brilliant endings. Looking for the one that sticks.",
      },
      {
        id: "hero-story-quiet-veteran",
        name: "The Quiet Veteran",
        description:
          "Done it before, more than once. Not chasing glory — chasing one more good thing.",
      },
      {
        id: "hero-story-outsider",
        name: "The Outsider",
        description:
          "Watched from the fringes for years. Knows exactly what's missing. Ready to stop watching.",
      },
      {
        id: "hero-story-accidental-founder",
        name: "The Accidental Founder",
        description:
          "Started as a side project. Refuses to stay small.",
      },
      {
        id: "hero-story-wildcard",
        name: "The Wildcard",
        description:
          "No story arc, no clean archetype. Here for the chaos and the company.",
      },
    ],
  },
  {
    id: "energy",
    name: "Energy",
    pickMin: 1, // brief: "pick 1"
    pickMax: 1,
    tags: [
      {
        id: "energy-mad-inventor",
        name: "Giving Mad Inventor Energy",
        description:
          "Chaotic, brilliant, mildly explosive. Great whiteboard, terrible time-keeping.",
      },
      {
        id: "energy-binder-for-everything",
        name: "Giving Binder-For-Everything Energy",
        description:
          "A plan for every contingency. Will out-enthusiasm your doubts.",
      },
      {
        id: "energy-vanishes-when-real",
        name: "Giving Vanishes-When-It-Gets-Real Energy",
        description:
          "Warm, whimsical, first out the door the second things get intense.",
      },
      {
        id: "energy-villain-monologue",
        name: "Giving Villain-Monologue Energy",
        description:
          "Big vision, bigger plan, needs someone to say \"okay but how.\"",
      },
      {
        id: "energy-sea-captain",
        name: "Giving Sea Captain Energy",
        description:
          "Calm in the storm. Everyone else is panicking; they're checking the compass.",
      },
      {
        id: "energy-feral-gremlin",
        name: "Giving Feral Gremlin Energy",
        description:
          "Unpredictable, a little destructive, somehow always right in the end.",
      },
      {
        id: "energy-wise-hermit",
        name: "Giving Wise Hermit Energy",
        description:
          "Off in the corner with a strange theory. The theory is usually correct.",
      },
      {
        id: "energy-golden-retriever-ceo",
        name: "Giving Golden Retriever CEO Energy",
        description:
          "Relentlessly positive, weirdly good at closing deals.",
      },
      {
        id: "energy-plot-twist",
        name: "Giving Plot Twist Energy",
        description:
          "You think you know where this is going. You do not.",
      },
      {
        id: "energy-group-project-mum",
        name: "Giving Group Project Mum Energy",
        description:
          "Will quietly carry the whole thing and never say so.",
      },
      {
        id: "energy-mad-scientist",
        name: "Giving Mad Scientist Energy",
        description:
          "Ethics: pending. Results: undeniable.",
      },
      {
        id: "energy-secret-chosen-one",
        name: "Giving Background-Character-Who's-Actually-The-Chosen-One Energy",
        description:
          "Underestimated. Temporarily.",
      },
    ],
  },
  {
    id: "vibe-diagnosis",
    name: "Vibe Diagnosis",
    pickMin: 1, // brief: "pick 1"
    pickMax: 1,
    tags: [
      {
        id: "vibe-diagnosis-main-character",
        name: "Certified Main Character",
        description:
          "Everyone else is supporting cast today. Apologies in advance.",
      },
      {
        id: "vibe-diagnosis-chaotic-neutral-spreadsheet",
        name: "Chaotic Neutral, But With A Spreadsheet",
        description:
          "The chaos is real. So is the colour-coding.",
      },
      {
        id: "vibe-diagnosis-mercury-retrograde",
        name: "Mercury In Retrograde, Permanently",
        description:
          "Nothing's their fault. Everything's an omen.",
      },
      {
        id: "vibe-diagnosis-visionary-untreated",
        name: "Diagnosed: Visionary, Untreated",
        description:
          "Big ideas, no follow-through plan, refuses medication for it.",
      },
      {
        id: "vibe-diagnosis-rising-feral",
        name: "Rising Sign: Feral",
        description:
          "Whatever the chart says, the moon made them do it.",
      },
      {
        id: "vibe-diagnosis-type-a-recovering",
        name: "Type A, Recovering",
        description:
          "Used to colour-code their sock drawer. Working on it. Still colour-codes the sock drawer.",
      },
      {
        id: "vibe-diagnosis-trust-the-process",
        name: "Big \"Trust The Process\" Energy, No Evidence Of A Process",
        description:
          "Vibes-based project management. Somehow it lands.",
      },
      {
        id: "vibe-diagnosis-enmeshed-with-deadline",
        name: "Attachment Style: Enmeshed With A Deadline",
        description:
          "Cannot relax until the thing is finished. Then immediately starts another thing.",
      },
      {
        id: "vibe-diagnosis-certified-overthinker",
        name: "Certified Overthinker, Field-Tested",
        description:
          "Will spiral for a week. The spiral produces excellent work.",
      },
      {
        id: "vibe-diagnosis-secretly-cancer",
        name: "Secretly A Cancer, Publicly A Sagittarius",
        description:
          "Soft interior, chaotic exterior. Do not test the exterior.",
      },
      {
        id: "vibe-diagnosis-its-complicated",
        name: "Personality Test Result: \"It's Complicated\"",
        description:
          "Took the quiz four times. Got four different answers. All correct.",
      },
      {
        id: "vibe-diagnosis-villain-era",
        name: "Currently In Their Villain Era",
        description:
          "Boundaries, finally. Mildly terrifying to everyone who knew the old version.",
      },
    ],
  },
  {
    id: "qualities",
    name: "Qualities",
    pickMin: 1, // brief: "pick up to 4"
    pickMax: 4,
    tags: [
      {
        id: "qualities-fog-into-floor-plan",
        name: "Turns fog into a floor plan",
        description:
          "Can take a vague, brilliant mess and make it buildable.",
      },
      {
        id: "qualities-finishes-the-thing",
        name: "Actually finishes the thing",
        description:
          "Rare. Precious. Do not let them leave the project.",
      },
      {
        id: "qualities-room-believes-it",
        name: "Makes the room believe it too",
        description:
          "Can sell a half-formed idea like it's already a success story.",
      },
      {
        id: "qualities-notices-what-was-missed",
        name: "Notices the thing everyone else missed",
        description:
          "The typo, the flaw, the gap in the plan. Every time.",
      },
      {
        id: "qualities-builds-with-hands",
        name: "Builds it with their actual hands",
        description:
          "Prototypes, code, objects, things that exist and work.",
      },
      {
        id: "qualities-beautiful-on-purpose",
        name: "Makes it beautiful on purpose",
        description:
          "Has actual taste, and can't switch it off.",
      },
      {
        id: "qualities-keeps-operation-running",
        name: "Keeps the whole operation from falling over",
        description:
          "Logistics, deadlines, the boring glue that holds a project together.",
      },
      {
        id: "qualities-knows-someone",
        name: "Knows someone who knows someone",
        description:
          "Has a genuinely useful network and isn't precious about sharing it.",
      },
      {
        id: "qualities-stays-calm",
        name: "Stays calm when everyone else is not",
        description:
          "The person you want in the room when it's going wrong.",
      },
      {
        id: "qualities-goes-deep",
        name: "Goes deep when it matters",
        description:
          "Will actually read the research, run the numbers, check the sources.",
      },
      {
        id: "qualities-says-hard-thing-kindly",
        name: "Says the hard thing kindly",
        description:
          "Gives feedback that stings a little and helps a lot.",
      },
      {
        id: "qualities-keeps-going-after-no",
        name: "Keeps going after the tenth \"no\"",
        description:
          "Genuine hustle. Doesn't take rejection as an answer.",
      },
    ],
  },
  {
    id: "seeking",
    name: "Seeking",
    pickMin: 1, // brief: "pick up to 4"
    pickMax: 4,
    tags: [
      {
        id: "seeking-makes-money-happen",
        name: "Someone who can actually make money happen",
        description:
          "Turns brilliant ideas into an invoice.",
      },
      {
        id: "seeking-finishes-what-i-start",
        name: "Someone who finishes what I start",
        description:
          "I have the spark. I need the follow-through.",
      },
      {
        id: "seeking-tells-me-idea-is-bad",
        name: "Someone who tells me when the idea is bad",
        description:
          "Kindly. Firmly. Before I've spent a month on it.",
      },
      {
        id: "seeking-makes-it-real",
        name: "Someone who makes it real with their hands",
        description:
          "I can see it. I cannot build it.",
      },
      {
        id: "seeking-boring-bits",
        name: "Someone who makes the boring bits happen",
        description:
          "Deadlines, spreadsheets, the admin nobody dreams about.",
      },
      {
        id: "seeking-believes-before-proof",
        name: "Someone who believes it before there's proof",
        description:
          "I need a first believer, not just a first customer.",
      },
      {
        id: "seeking-knows-the-room",
        name: "Someone who already knows the room",
        description:
          "Contacts, credibility, a door I can't open alone.",
      },
      {
        id: "seeking-stays-when-hard",
        name: "Someone who stays when it gets hard",
        description:
          "Not just for the fun 20%, for the rest of it too.",
      },
      {
        id: "seeking-makes-it-look-good",
        name: "Someone who makes it look as good as it is",
        description:
          "The idea's solid. It needs to look solid too.",
      },
      {
        id: "seeking-asks-smart-questions",
        name: "Someone who asks the annoying smart questions",
        description:
          "The ones that save us three months later.",
      },
      {
        id: "seeking-matches-my-chaos",
        name: "Someone who matches my chaos",
        description:
          "Not a babysitter. A co-conspirator.",
      },
      {
        id: "seeking-done-this-before",
        name: "Someone who's done this before",
        description:
          "I don't want a mentor. I want a scar-tissue-having accomplice.",
      },
    ],
  },
];

// The bootcamp courses users sign up from. Recorded on each user (slice 1)
// but not used in scoring.
export const seedCourses: SeedCourse[] = [
  { id: "software", name: "Software" },
  { id: "business", name: "Business" },
];
