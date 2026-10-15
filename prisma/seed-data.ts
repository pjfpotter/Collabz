// The starting content of the tag catalogue: 7 categories x 12 tags, and the
// 2 courses. prisma/seed.ts reads this and inserts any rows that are missing.
// The first 5 categories come from the brief; Skills and Interests were added
// by onboarding (slice 2, #9, design decision 8).
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
  // The short word this tag adds to a person's alias, e.g. "Feral" or
  // "Sea Captain" -> "The Feral Sea Captain" (slice 2, #9, design decision 4).
  // Only Energy and Vibe Diagnosis tags have one, hence optional.
  aliasWord?: string;
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

// One Seeking tag and the Quality tags that satisfy it (slice 3, #10).
// A Seeking tag is met when the other person has ANY ONE of these Qualities.
// seed.ts turns each Quality in the list into one TagPairing row.
export type SeedPairing = {
  seekingTagId: string;
  qualityTagIds: string[];
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
        aliasWord: "Inventor",
        name: "Giving Mad Inventor Energy",
        description:
          "Chaotic, brilliant, mildly explosive. Great whiteboard, terrible time-keeping.",
      },
      {
        id: "energy-binder-for-everything",
        aliasWord: "Planner",
        name: "Giving Binder-For-Everything Energy",
        description:
          "A plan for every contingency. Will out-enthusiasm your doubts.",
      },
      {
        id: "energy-vanishes-when-real",
        aliasWord: "Escape Artist",
        name: "Giving Vanishes-When-It-Gets-Real Energy",
        description:
          "Warm, whimsical, first out the door the second things get intense.",
      },
      {
        id: "energy-villain-monologue",
        aliasWord: "Mastermind",
        name: "Giving Villain-Monologue Energy",
        description:
          "Big vision, bigger plan, needs someone to say \"okay but how.\"",
      },
      {
        id: "energy-sea-captain",
        aliasWord: "Sea Captain",
        name: "Giving Sea Captain Energy",
        description:
          "Calm in the storm. Everyone else is panicking; they're checking the compass.",
      },
      {
        id: "energy-feral-gremlin",
        aliasWord: "Gremlin",
        name: "Giving Feral Gremlin Energy",
        description:
          "Unpredictable, a little destructive, somehow always right in the end.",
      },
      {
        id: "energy-wise-hermit",
        aliasWord: "Hermit",
        name: "Giving Wise Hermit Energy",
        description:
          "Off in the corner with a strange theory. The theory is usually correct.",
      },
      {
        id: "energy-golden-retriever-ceo",
        aliasWord: "Golden Retriever",
        name: "Giving Golden Retriever CEO Energy",
        description:
          "Relentlessly positive, weirdly good at closing deals.",
      },
      {
        id: "energy-plot-twist",
        aliasWord: "Plot Twist",
        name: "Giving Plot Twist Energy",
        description:
          "You think you know where this is going. You do not.",
      },
      {
        id: "energy-group-project-mum",
        aliasWord: "Project Mum",
        name: "Giving Group Project Mum Energy",
        description:
          "Will quietly carry the whole thing and never say so.",
      },
      {
        id: "energy-mad-scientist",
        aliasWord: "Mad Scientist",
        name: "Giving Mad Scientist Energy",
        description:
          "Ethics: pending. Results: undeniable.",
      },
      {
        id: "energy-secret-chosen-one",
        aliasWord: "Chosen One",
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
        aliasWord: "Main-Character",
        name: "Certified Main Character",
        description:
          "Everyone else is supporting cast today. Apologies in advance.",
      },
      {
        id: "vibe-diagnosis-chaotic-neutral-spreadsheet",
        aliasWord: "Chaotic",
        name: "Chaotic Neutral, But With A Spreadsheet",
        description:
          "The chaos is real. So is the colour-coding.",
      },
      {
        id: "vibe-diagnosis-mercury-retrograde",
        aliasWord: "Retrograde",
        name: "Mercury In Retrograde, Permanently",
        description:
          "Nothing's their fault. Everything's an omen.",
      },
      {
        id: "vibe-diagnosis-visionary-untreated",
        aliasWord: "Visionary",
        name: "Diagnosed: Visionary, Untreated",
        description:
          "Big ideas, no follow-through plan, refuses medication for it.",
      },
      {
        id: "vibe-diagnosis-rising-feral",
        aliasWord: "Feral",
        name: "Rising Sign: Feral",
        description:
          "Whatever the chart says, the moon made them do it.",
      },
      {
        id: "vibe-diagnosis-type-a-recovering",
        aliasWord: "Recovering",
        name: "Type A, Recovering",
        description:
          "Used to colour-code their sock drawer. Working on it. Still colour-codes the sock drawer.",
      },
      {
        id: "vibe-diagnosis-trust-the-process",
        aliasWord: "Vibes-Based",
        name: "Big \"Trust The Process\" Energy, No Evidence Of A Process",
        description:
          "Vibes-based project management. Somehow it lands.",
      },
      {
        id: "vibe-diagnosis-enmeshed-with-deadline",
        aliasWord: "Deadline-Driven",
        name: "Attachment Style: Enmeshed With A Deadline",
        description:
          "Cannot relax until the thing is finished. Then immediately starts another thing.",
      },
      {
        id: "vibe-diagnosis-certified-overthinker",
        aliasWord: "Overthinking",
        name: "Certified Overthinker, Field-Tested",
        description:
          "Will spiral for a week. The spiral produces excellent work.",
      },
      {
        id: "vibe-diagnosis-secretly-cancer",
        aliasWord: "Starcrossed",
        name: "Secretly A Cancer, Publicly A Sagittarius",
        description:
          "Soft interior, chaotic exterior. Do not test the exterior.",
      },
      {
        id: "vibe-diagnosis-its-complicated",
        aliasWord: "Complicated",
        name: "Personality Test Result: \"It's Complicated\"",
        description:
          "Took the quiz four times. Got four different answers. All correct.",
      },
      {
        id: "vibe-diagnosis-villain-era",
        aliasWord: "Villainous",
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
  // Skills and Interests are NOT in the brief's five exercises. Onboarding
  // (slice 2, #9) added them so profiles say what people can do and care
  // about (the brief's "skills, interests"). They're shown on profiles and
  // shared ones are listed "for information", but they aren't scored (B5).
  // The lists are the ones the team approved in #9's design (decision 8).
  {
    id: "skills",
    name: "Skills",
    pickMin: 1, // team decision, 1 Oct 2026: no empty categories
    pickMax: 4,
    tags: [
      {
        id: "skills-front-end",
        name: "Front-end",
        description: "The buttons, the screens, the bits people actually touch.",
      },
      {
        id: "skills-back-end",
        name: "Back-end",
        description: "Servers and databases, the plumbing nobody sees until it leaks.",
      },
      {
        id: "skills-data",
        name: "Data",
        description: "Turns a pile of numbers into a sentence someone believes.",
      },
      {
        id: "skills-mobile",
        name: "Mobile",
        description: "Thinks in thumbs and small screens.",
      },
      {
        id: "skills-design",
        name: "Design",
        description: 'Asks "but who is this for?" and means it.',
      },
      {
        id: "skills-ai-automation",
        name: "AI & Automation",
        description: "Teaches computers to do the boring bit.",
      },
      {
        id: "skills-marketing",
        name: "Marketing",
        description: "Gets the right people to notice, then to care.",
      },
      {
        id: "skills-sales",
        name: "Sales",
        description: "Turns a good conversation into a signed deal.",
      },
      {
        id: "skills-finance",
        name: "Finance",
        description: "Knows what it costs, what it earns and what's left.",
      },
      {
        id: "skills-operations",
        name: "Operations",
        description: "Timelines, owners, next steps. The plan behind the plan.",
      },
      {
        id: "skills-strategy",
        name: "Strategy",
        description: "Knows the market, the rivals and the gap between them.",
      },
      {
        id: "skills-writing",
        name: "Writing",
        description: "Finds the words that make the idea land.",
      },
    ],
  },
  {
    id: "interests",
    name: "Interests",
    pickMin: 1, // team decision, 1 Oct 2026: no empty categories
    pickMax: 4,
    tags: [
      {
        id: "interests-climate",
        name: "Climate",
        description: "Wants the planet to still be here for the sequel.",
      },
      {
        id: "interests-health",
        name: "Health",
        description: "Bodies, minds and the apps that look after both.",
      },
      {
        id: "interests-education",
        name: "Education",
        description: "Believes anyone can learn anything with the right nudge.",
      },
      {
        id: "interests-money",
        name: "Money",
        description: "Fintech, budgets and making cash less confusing.",
      },
      {
        id: "interests-games",
        name: "Games",
        description: "Play is serious business.",
      },
      {
        id: "interests-music",
        name: "Music",
        description: "Lives with headphones on.",
      },
      {
        id: "interests-film-video",
        name: "Film & Video",
        description: "Thinks in shots, cuts and thumbnails.",
      },
      {
        id: "interests-fashion",
        name: "Fashion",
        description: "Knows what people will wear before they do.",
      },
      {
        id: "interests-food",
        name: "Food",
        description: "Every good idea started over a meal.",
      },
      {
        id: "interests-community",
        name: "Community",
        description: "Local, social, the people next door.",
      },
      {
        id: "interests-travel",
        name: "Travel",
        description: "Happiest somewhere they've never been.",
      },
      {
        id: "interests-sport",
        name: "Sport",
        description: "Training, teams and the numbers behind them.",
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

// Which Seeking tag is satisfied by which Quality tags (slice 3, #10, design
// decision 3). The matching score's "complement" part counts these.
//
// WHY THESE ARE WRITTEN BY ID AND NOT BY NAME: tag names can be reworded by
// an admin, but an id never changes (rule B2), so a pairing keeps pointing
// at the right tag after a rename.
//
// This is the team's agreed list (see design.md for the reason behind each
// pair). Every one of the 12 Seeking tags appears once, and every one of the
// 12 Qualities satisfies at least one Seeking tag. 23 pairs in total.
export const seedPairings: SeedPairing[] = [
  {
    seekingTagId: "seeking-makes-money-happen",
    qualityTagIds: ["qualities-knows-someone", "qualities-room-believes-it"],
  },
  {
    seekingTagId: "seeking-finishes-what-i-start",
    qualityTagIds: ["qualities-finishes-the-thing", "qualities-keeps-operation-running"],
  },
  {
    seekingTagId: "seeking-tells-me-idea-is-bad",
    qualityTagIds: ["qualities-says-hard-thing-kindly", "qualities-notices-what-was-missed"],
  },
  {
    seekingTagId: "seeking-makes-it-real",
    qualityTagIds: ["qualities-builds-with-hands", "qualities-fog-into-floor-plan"],
  },
  {
    seekingTagId: "seeking-boring-bits",
    qualityTagIds: ["qualities-keeps-operation-running", "qualities-finishes-the-thing"],
  },
  {
    seekingTagId: "seeking-believes-before-proof",
    qualityTagIds: ["qualities-room-believes-it", "qualities-keeps-going-after-no"],
  },
  {
    seekingTagId: "seeking-knows-the-room",
    qualityTagIds: ["qualities-knows-someone", "qualities-room-believes-it"],
  },
  {
    seekingTagId: "seeking-stays-when-hard",
    qualityTagIds: ["qualities-stays-calm", "qualities-keeps-going-after-no"],
  },
  {
    // Only one Quality is about how things look, so this has one pair.
    seekingTagId: "seeking-makes-it-look-good",
    qualityTagIds: ["qualities-beautiful-on-purpose"],
  },
  {
    seekingTagId: "seeking-asks-smart-questions",
    qualityTagIds: ["qualities-notices-what-was-missed", "qualities-goes-deep"],
  },
  {
    // The weakest pairing, and the one most worth arguing about (design 3).
    seekingTagId: "seeking-matches-my-chaos",
    qualityTagIds: ["qualities-goes-deep", "qualities-keeps-going-after-no"],
  },
  {
    seekingTagId: "seeking-done-this-before",
    qualityTagIds: ["qualities-knows-someone", "qualities-fog-into-floor-plan"],
  },
];
