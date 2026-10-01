# Collabz MVP — Brief for `/opsx:propose`

This is the discovery output from a human interview, done before opening Claude Code — not a finished spec. Run `/opsx:propose` for this feature using everything below as the raw material. Read the existing project first. If anything here is ambiguous, underspecified, or conflicts with what's already in the repo, ask — don't invent an answer.

## What Collabz is

A chemistry-based collaboration-matching app for creatives, built as bootcamp coursework. No CVs, no portfolios, no free text. Profiles are built entirely from picking evocative, Fallen-London-style tags from fixed lists. The MVP will run a live test with real students: software-course learners matched against business-course learners.

## Scope for this MVP (4 weeks)

**In scope:**
- Onboarding (5 pick-from-list exercises, described below)
- Picked-silhouette avatars (no avatar builder)
- Pairwise chemistry scoring between all profiles
- A full, visible, force-directed graph (all nodes, all users can see it — not just their own matches)
- A connect flow: request → notification → approve → contact details reveal
- Basic safety: report/block + Terms & Conditions + a data policy
- Auth via real signup (QR code → magic link), since this is a live test with real students

**Explicitly out of scope (parked for later):**
- In-app chat
- Project nodes (users proposing a project together that joins the graph, drawing in further collaborators) — this is a deliberately parked phase-two idea
- Any custom avatar builder beyond picking a silhouette

## Onboarding — 5 exercises, all pick-from-list, nothing typed

Design rule: "never give them an empty box" — every input is a constrained selection, no free text anywhere in onboarding.

### 1. Hero Story — pick 1
1. The Brilliant Graduate — Not yet crushed. Convinced the world is still theirs to take.
2. The Burnt-Out Prodigy — Was gifted once. Is tired now. Wants the fire back, not the label.
3. The Late Bloomer — Took the scenic route. Arrived exactly when they needed to.
4. The Reinventor — Burned the old career to the ground. Building something true from the ash.
5. The Corporate Escapee — Ten years in the machine. Remembers, faintly, that they used to make things.
6. The Eternal Apprentice — Still learning, on purpose, forever. Suspicious of anyone who claims to be finished.
7. The Dreamer Who Hasn't Started — Has the idea. Has always had the idea. Needs a reason to begin.
8. The Serial Starter — Twelve brilliant beginnings. Zero brilliant endings. Looking for the one that sticks.
9. The Quiet Veteran — Done it before, more than once. Not chasing glory — chasing one more good thing.
10. The Outsider — Watched from the fringes for years. Knows exactly what's missing. Ready to stop watching.
11. The Accidental Founder — Started as a side project. Refuses to stay small.
12. The Wildcard — No story arc, no clean archetype. Here for the chaos and the company.

### 2. Energy — pick 1
1. Giving Mad Inventor Energy — Chaotic, brilliant, mildly explosive. Great whiteboard, terrible time-keeping.
2. Giving Binder-For-Everything Energy — A plan for every contingency. Will out-enthusiasm your doubts.
3. Giving Vanishes-When-It-Gets-Real Energy — Warm, whimsical, first out the door the second things get intense.
4. Giving Villain-Monologue Energy — Big vision, bigger plan, needs someone to say "okay but how."
5. Giving Sea Captain Energy — Calm in the storm. Everyone else is panicking; they're checking the compass.
6. Giving Feral Gremlin Energy — Unpredictable, a little destructive, somehow always right in the end.
7. Giving Wise Hermit Energy — Off in the corner with a strange theory. The theory is usually correct.
8. Giving Golden Retriever CEO Energy — Relentlessly positive, weirdly good at closing deals.
9. Giving Plot Twist Energy — You think you know where this is going. You do not.
10. Giving Group Project Mum Energy — Will quietly carry the whole thing and never say so.
11. Giving Mad Scientist Energy — Ethics: pending. Results: undeniable.
12. Giving Background-Character-Who's-Actually-The-Chosen-One Energy — Underestimated. Temporarily.

### 3. Vibe Diagnosis — pick 1
1. Certified Main Character — Everyone else is supporting cast today. Apologies in advance.
2. Chaotic Neutral, But With A Spreadsheet — The chaos is real. So is the colour-coding.
3. Mercury In Retrograde, Permanently — Nothing's their fault. Everything's an omen.
4. Diagnosed: Visionary, Untreated — Big ideas, no follow-through plan, refuses medication for it.
5. Rising Sign: Feral — Whatever the chart says, the moon made them do it.
6. Type A, Recovering — Used to colour-code their sock drawer. Working on it. Still colour-codes the sock drawer.
7. Big "Trust The Process" Energy, No Evidence Of A Process — Vibes-based project management. Somehow it lands.
8. Attachment Style: Enmeshed With A Deadline — Cannot relax until the thing is finished. Then immediately starts another thing.
9. Certified Overthinker, Field-Tested — Will spiral for a week. The spiral produces excellent work.
10. Secretly A Cancer, Publicly A Sagittarius — Soft interior, chaotic exterior. Do not test the exterior.
11. Personality Test Result: "It's Complicated" — Took the quiz four times. Got four different answers. All correct.
12. Currently In Their Villain Era — Boundaries, finally. Mildly terrifying to everyone who knew the old version.

### 4. Qualities — pick up to 4 (what they bring)
1. Turns fog into a floor plan — Can take a vague, brilliant mess and make it buildable.
2. Actually finishes the thing — Rare. Precious. Do not let them leave the project.
3. Makes the room believe it too — Can sell a half-formed idea like it's already a success story.
4. Notices the thing everyone else missed — The typo, the flaw, the gap in the plan. Every time.
5. Builds it with their actual hands — Prototypes, code, objects, things that exist and work.
6. Makes it beautiful on purpose — Has actual taste, and can't switch it off.
7. Keeps the whole operation from falling over — Logistics, deadlines, the boring glue that holds a project together.
8. Knows someone who knows someone — Has a genuinely useful network and isn't precious about sharing it.
9. Stays calm when everyone else is not — The person you want in the room when it's going wrong.
10. Goes deep when it matters — Will actually read the research, run the numbers, check the sources.
11. Says the hard thing kindly — Gives feedback that stings a little and helps a lot.
12. Keeps going after the tenth "no" — Genuine hustle. Doesn't take rejection as an answer.

### 5. Seeking — pick up to 4 (what they need from a collaborator)
1. Someone who can actually make money happen — Turns brilliant ideas into an invoice.
2. Someone who finishes what I start — I have the spark. I need the follow-through.
3. Someone who tells me when the idea is bad — Kindly. Firmly. Before I've spent a month on it.
4. Someone who makes it real with their hands — I can see it. I cannot build it.
5. Someone who makes the boring bits happen — Deadlines, spreadsheets, the admin nobody dreams about.
6. Someone who believes it before there's proof — I need a first believer, not just a first customer.
7. Someone who already knows the room — Contacts, credibility, a door I can't open alone.
8. Someone who stays when it gets hard — Not just for the fun 20%, for the rest of it too.
9. Someone who makes it look as good as it is — The idea's solid. It needs to look solid too.
10. Someone who asks the annoying smart questions — The ones that save us three months later.
11. Someone who matches my chaos — Not a babysitter. A co-conspirator.
12. Someone who's done this before — I don't want a mentor. I want a scar-tissue-having accomplice.

**Total per profile:** 3 single-pick identity tags + up to 4 Qualities + up to 4 Seeking = up to 11 structured tags, zero free text.

## Avatar

Pick-a-silhouette, same "choose from a set" mechanic as everything else — no upload, no custom builder, no professional headshots allowed.

## Matching — how an edge score is calculated between any two profiles

```
score = (complement_count × 3) + (overlap_bonus × 1) + (tension_bonus × 1)
```

- **Complement (main signal):** count how many of Person A's *Seeking* tags match Person B's *Qualities* tags, and vice versa.
- **Overlap (rapport bonus):** +1 if they share the same Energy tag; +1 if they share the same Vibe Diagnosis tag.
- **Tension (spark bonus):** +1 if their Hero Story tags are *different* (working against pure similarity, on purpose).
- **Glitch:** separate from scoring entirely — each user also gets one genuinely random profile surfaced as a match, visually distinguished on the graph (different edge style/colour, not thickness — thickness is used for score). The glitch match does not count against the contactable-matches limit.

Compute all pairwise scores server-side after onboarding (or via a recompute job), store the resulting edges — don't recalculate on every page load.

## Graph

- Force-directed graph (same underlying approach as Obsidian's graph view — nodes repel, edges pull, edge strength affects pull and line thickness).
- **Every user can see the full graph**, not just their own matches — all nodes, all edges, weighted by score.
- Each user can send connection requests only to their **own top 5 strongest edges** (relative rank, not a fixed score threshold — keeps it fair across a mixed cohort). The glitch match is free and doesn't use up one of the 5.

## Connection flow

1. User A sends a connection request to one of their top-5 (or their glitch match).
2. User B gets a notification in their UI.
3. If User B approves, both users' contact details become visible to each other.
4. No in-app chat for MVP — contact happens off-platform once revealed.

## Safety & compliance

- Report and block, minimum viable version (no moderation queue needed for MVP).
- A Terms & Conditions document and a data policy — real requirement, since this involves real students' data.

## Suggested stack

- **Next.js (React)**, using Next.js API routes as the backend — one codebase, no separate Node/Express service.
- **Neon (Postgres) + Prisma** as the ORM — keep the schema file as the single readable source of the data shape.
- **Auth.js (NextAuth)**, email magic-link sign-in — no passwords, fits the QR-code-to-signup flow, smaller GDPR surface.
- **`react-force-graph`** for the graph itself — weighted edges out of the box.
- **Vercel** for hosting — native fit for Next.js, trivial to point a QR code at.

## Success check (demo day)

Students from both the software and business courses scan a QR code, sign up via magic link, and complete onboarding. Each can view the full weighted graph, see their own top-5 contactable matches plus one glitch match, and successfully send at least one connection request.
