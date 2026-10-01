# Design: Slice 2, onboarding: pick-from-list profile (#9)

## Context

- See `proposal.md` (Why) for the motivation and `specs/` for the requirements.
- **Nothing is built yet.** #6 (skeleton and catalogue) and #7 (foundation) are planned but not merged. This design builds on what they plan:
  - #6 (`openspec/changes/6-tag-catalogue/design.md`): `Category` (`id`, `name`, `pickMin`, `pickMax`, `order`, `retiredAt`), `Tag` (`id`, `categoryId`, `name`, `description`, `order`, `retiredAt`), readable string ids (e.g. `energy`, `energy-sea-captain`), and a seed that only adds missing rows. It also plans `src/lib/db.ts`, `getCatalogue()`, Vitest and Playwright against a Neon `dev` branch, and Tailwind.
  - #7 (issue): `User`, `Profile` (`userId`, `silhouette`, `alias`, `photoKey?`, `completedAt`) and `ProfileTag` (`userId`, `tagId`), plus `getCurrentUser()`, `scoreUser(userId)` (a no-op for now), the dev "sign in as…" switcher, the pretend cohort, and the route plan, which gives this track `/onboarding`.
- If #6 or #7 end up using different names, the tasks follow the real names. Nothing in this design depends on a particular spelling.
- Readers are beginners, so every non-obvious line gets a comment explaining *why*.

## Goals / Non-Goals

**Goals:**
- A new user goes from "no profile" to "finished profile" in one sitting, on a phone, without typing.
- The server never trusts the browser: limits and tags are checked again before anything is saved.
- The step screens, the alias and the bio are reusable by slice 7 (editing) and slice 4 (profile view) without copying code.

**Non-Goals:**
- Saving half-finished onboarding between visits. Onboarding takes a couple of minutes, and leaving halfway means starting again.
- Showing the profile anywhere except `/onboarding/done`. Other tracks own `/people/[alias]` and `/account`.
- Any admin editing (slice 8, the next slice on this track).

## Decisions

### 1. One page with a step-by-step client component, one save at the end
`src/app/onboarding/page.tsx` is a Server Component. It checks who the user is (decision 6), loads the active catalogue with `getCatalogue()`, and passes it to `OnboardingWizard` (a Client Component). The wizard shows one step per screen, keeps the picks in React state, and sends everything once at the end.
- *Why one save:* the profile is either complete or doesn't exist, so the database never holds a half-finished profile that matching (slice 3) or the graph (slice 4) would have to guard against.
- *Why one screen per step:* the live test runs on phones, and twelve tags with descriptions fill a phone screen.
- *Why the steps come from the catalogue (in `Category.order`) and not a fixed list of seven:* the spec says limits come from the catalogue, and an admin may add a category later (slice 8). The silhouette step is always last.
- *Alternative:* save after every step. It survives a refresh but needs "in progress" profiles everywhere. Rejected for now. It can be added later with `sessionStorage` without changing the server.

### 2. A reusable `PickStep` component
`src/app/onboarding/PickStep.tsx` takes a category (with `pickMin`, `pickMax` and its tags), the current picks and an `onChange` callback. Tags are buttons that toggle on and off (`aria-pressed`), each showing the tag's name and description. When `pickMax` is 1, picking a new tag replaces the old one. When the limit is reached, the other tags are disabled and a line says "You can pick up to 4". "Next" stays disabled until `pickMin` is met.
- *Why buttons and not checkboxes or radios:* large tap targets on a phone, and still accessible through `aria-pressed`.
- *Why a separate component:* slice 7 reuses it to edit one category at a time.

### 3. Saving through an API route: `POST /api/onboarding`
Body: `{ picks: { [categoryId]: tagId[] }, silhouetteId }`. The route:
1. Gets the user with `getCurrentUser()`. No user → 401. Profile already complete → 409 (editing is slice 7).
2. Calls `validateOnboardingAnswers(answers, catalogue)` from `src/lib/profile/validateAnswers.ts`. It checks that every active category is within its limits, every tag is active and in that category, and the silhouette id is in the set. If anything fails → 400, with a list of problems by category, so the wizard can send the user back to that step.
3. In one Prisma transaction: creates the `Profile` (alias, silhouette, `completedAt = now`) and its `ProfileTag` rows.
4. After the transaction commits, calls `scoreUser(user.id)`. If that throws, the error is logged and the save still counts.
5. Returns `{ alias }`. The wizard then goes to `/onboarding/done`.
- *Why an API route and not a Server Action:* the project context fixes "API routes as the backend", and a plain route can be tested with a normal HTTP request.
- *Why the validation is a separate pure function:* it is the rule that protects the data, so it gets unit tests without a browser or a database. Slice 7 reuses it.
- *Why `scoreUser` runs after the commit and can't undo it:* the profile is the user's own work. A scoring bug (slice 3) shouldn't throw it away, and the score can be rerun.

### 4. Alias: the words live on the tag; numbering is checked against the database
- **Schema:** add `aliasWord String?` to `Tag` (**flag to Patrick before apply**). It is only used on Energy and Vibe Diagnosis tags. *Why a column (team choice):* the words stay with the data they describe, the same ids exist on dev and production, and the admin slice can edit them later. *Alternatives:* a map in code keyed by tag id (no schema change, but tag-specific data in code, against B2), or random word lists (loses "built from your own tags").
- **`src/lib/profile/alias.ts`:**
  - `baseAlias(vibeTag, energyTag)` returns `"The " + vibe word + " " + energy word`. A missing word falls back to `"Mysterious"` (vibe) or `"Collaborator"` (energy).
  - `toRoman(n)` turns a number into a Roman numeral.
  - `generateAlias(base, takenAliases)` returns `base` if it's free, otherwise `base II`, `base III` and so on.
- **Uniqueness:** `Profile.alias` gets a unique constraint (part of the same schema flag, if #7 doesn't already have it). The route loads the aliases that start with the base, picks the next free one, and inside the transaction retries up to 3 times if two people finish at the same moment and the unique constraint rejects the insert. *Why rely on the database:* checking first and then inserting leaves a gap where two requests can both see the name as free. The unique constraint is the only thing that truly closes it.
- **Proposed alias words** (in `seed-data.ts`, for the team to edit):

| Vibe Diagnosis tag | Word | | Energy tag | Word |
|---|---|---|---|---|
| Certified Main Character | Main-Character | | Mad Inventor | Inventor |
| Chaotic Neutral, But With A Spreadsheet | Chaotic | | Binder-For-Everything | Planner |
| Mercury In Retrograde, Permanently | Retrograde | | Vanishes-When-It-Gets-Real | Escape Artist |
| Diagnosed: Visionary, Untreated | Visionary | | Villain-Monologue | Mastermind |
| Rising Sign: Feral | Feral | | Sea Captain | Sea Captain |
| Type A, Recovering | Recovering | | Feral Gremlin | Gremlin |
| Big "Trust The Process" Energy… | Vibes-Based | | Wise Hermit | Hermit |
| Attachment Style: Enmeshed With A Deadline | Deadline-Driven | | Golden Retriever CEO | Golden Retriever |
| Certified Overthinker, Field-Tested | Overthinking | | Plot Twist | Plot Twist |
| Secretly A Cancer, Publicly A Sagittarius | Starcrossed | | Group Project Mum | Project Mum |
| Personality Test Result: "It's Complicated" | Complicated | | Mad Scientist | Mad Scientist |
| Currently In Their Villain Era | Villainous | | Background-Character-…-Chosen-One | Chosen One |

### 5. Bio: a pure function that builds sentences from tag names
`src/lib/profile/bio.ts` exports `generateBio(tagsByCategory)`. It returns plain sentences, for example:
> The Corporate Escapee, giving Sea Captain Energy. Brings: actually finishes the thing and says the hard thing kindly. Looking for: someone who finishes what I start. Skills: Back-end, Data. Into: Climate.
- Lists are joined as "a", "a and b", or "a, b and c". Quality and Seeking names start lowercase in mid-sentence.
- It is computed every time it's shown and never stored (#4 D-new-2), so a renamed tag shows up straight away.
- It finds categories by their seeded ids (`hero-story`, `energy`, `qualities`, `seeking`, `skills`, `interests`) and ignores any category it doesn't know. *Why:* a category an admin adds later then can't break the bio.
- *Why Vibe isn't in the bio:* the spec's list doesn't include it, and it already appears in the alias.

### 6. Who gets sent where: one helper, called at the top of a page
- `src/lib/profile/onboardingRedirect.ts` exports `redirectIfOnboardingIncomplete()`. It calls `getCurrentUser()`: no user → `redirect('/signin')`; no completed profile → `redirect('/onboarding')`; otherwise it returns the user.
- `/onboarding` does the opposite check: a completed profile → `redirect('/onboarding/done')`.
- *Why a helper and not Next.js middleware:* middleware runs on the edge, where Prisma doesn't run with our setup. A helper is also something a beginner can see at the top of each page. *Why other pages don't call it yet:* track rules say we only edit our own routes. Adding the one-line call to `/graph`, `/matches` and the others happens in join-up (#17).

### 7. Silhouettes: 12 SVG files, the list kept in code
- `public/silhouettes/silhouette-01.svg` … `silhouette-12.svg`: flat head-and-shoulders shapes in one colour, each different (hair, glasses, hat, hood…), drawn by hand as small SVGs (no new dependency, no licence to check).
- `src/lib/profile/silhouettes.ts` exports the list of ids and labels (used as `alt` text) and `silhouetteUrl(id)`. `Profile.silhouette` stores the id.
- *Why this list is in code and not the database:* silhouettes are files that ship with the app. Admins can't upload new ones, so a table would only be able to disagree with the folder.
- *Why SVG:* tiny, sharp at any size, and they can follow dark mode with `currentColor`.

### 8. Seed: add Skills and Interests, fill in alias words, fix pick limits on existing databases
- `prisma/seed-data.ts` gets two new categories (`skills`, order 6, and `interests`, order 7, both `pickMin 1`/`pickMax 4`), their 24 tags, and `aliasWord` on the 24 Energy and Vibe tags. Qualities and Seeking get `pickMin: 1`.
- `prisma/seed.ts`: after the existing `createMany({ skipDuplicates: true })`, it runs one `updateMany` per alias word with `where: { id, aliasWord: null }`. *Why:* this fills only empty words, so a word an admin later edits survives a re-seed (the spirit of #6 decision 5).
- **Migration** (alongside the `aliasWord` column): `UPDATE "Category" SET "pickMin" = 1 WHERE id IN ('qualities','seeking') AND "pickMin" = 0`. *Why a migration and not the seed:* the seed never overwrites existing values, so a database #6 already seeded would keep the old minimum of 0. A migration runs exactly once per database.
- **Proposed Skills** (name: description):
  1. Front-end: The buttons, the screens, the bits people actually touch.
  2. Back-end: Servers and databases, the plumbing nobody sees until it leaks.
  3. Data: Turns a pile of numbers into a sentence someone believes.
  4. Mobile: Thinks in thumbs and small screens.
  5. Design: Asks "but who is this for?" and means it.
  6. AI & Automation: Teaches computers to do the boring bit.
  7. Marketing: Gets the right people to notice, then to care.
  8. Sales: Turns a good conversation into a signed deal.
  9. Finance: Knows what it costs, what it earns and what's left.
  10. Operations: Timelines, owners, next steps. The plan behind the plan.
  11. Strategy: Knows the market, the rivals and the gap between them.
  12. Writing: Finds the words that make the idea land.
- **Proposed Interests:**
  1. Climate: Wants the planet to still be here for the sequel.
  2. Health: Bodies, minds and the apps that look after both.
  3. Education: Believes anyone can learn anything with the right nudge.
  4. Money: Fintech, budgets and making cash less confusing.
  5. Games: Play is serious business.
  6. Music: Lives with headphones on.
  7. Film & Video: Thinks in shots, cuts and thumbnails.
  8. Fashion: Knows what people will wear before they do.
  9. Food: Every good idea started over a meal.
  10. Community: Local, social, the people next door.
  11. Travel: Happiest somewhere they've never been.
  12. Sport: Training, teams and the numbers behind them.
- Ids follow #6's pattern: `skills-back-end`, `interests-climate` and so on.

### 9. `/onboarding/done` and a shared `ProfileCard`
`src/components/ProfileCard.tsx` takes `{ alias, silhouetteId, bio, skills, interests, course? }` and shows them. The done page loads the user's profile and tags, builds the bio and renders the card, with a link onward (to `/graph` once it exists).
- *Why a shared component:* slices 4 and 7 show the same card. It never takes an email or a photo, so the "strangers never see the email" rule is built into what it can display.

### 10. Tests
- **Vitest, no database:** `validateOnboardingAnswers` (each limit, wrong category, retired tag, unknown silhouette), `generateAlias`/`toRoman` (free, taken, II→III, fallback words), `generateBio` (the spec's scenario, list joining, missing optional categories).
- **Vitest against the test database:** the seed (7 categories, 24 new tags, alias words filled in but not overwritten) and the API route (valid save writes the profile and tags in one go; invalid save writes nothing; second save → 409; two users with the same Vibe and Energy get distinct aliases).
- **Playwright:** a pretend user with no profile (via the dev switcher) completes all eight steps by clicking only, the page contains no `input[type=text]` or `textarea`, the limits stop a fifth pick and block an empty step, and the done page shows alias, silhouette and bio.

## Risks / Trade-offs

- **[#6 and #7 aren't merged, so names may differ]** → The first task checks the real schema and helper names and adjusts. Nothing here needs a specific spelling.
- **[Schema change on a shared table]** → `Tag.aliasWord` and `Profile.alias @unique` are flagged to Patrick before apply, as CLAUDE.md requires. If #7 hasn't merged yet, the cleanest option is to fold them into #7's schema.
- **[Refreshing mid-onboarding loses the picks]** → Accepted (non-goal). It takes about 2 minutes. `sessionStorage` can be added later in the wizard alone.
- **[Funny or clashing aliases, e.g. "The Villainous Mastermind"]** → That's part of the tone. The words are seed data, so the team can change them before approval and admins can change them after.
- **[144 Vibe × Energy combinations, so repeats will happen in a cohort]** → Roman numerals keep aliases unique. The silhouette helps tell people apart on the graph.
- **[An alias with spaces in a `/people/[alias]` URL]** → Track 4 decides how to encode it. It's flagged for join-up.
- **[Bio grammar with odd tag names]** → Unit tests cover all 12 Hero Stories and Energies, so every sentence is checked at least once.

## Migration Plan

1. Flag the schema change to Patrick and agree whether it lands in #7 or here.
2. Create the migration on the `dev` branch (adds the column, adds the unique constraint if it's missing, fixes `pickMin`).
3. Deploy as usual. #6's build command runs `prisma migrate deploy && prisma db seed`, so production gets the column, the new categories and the alias words automatically.

**Rollback:** Vercel Instant Rollback. The migration only adds a nullable column and raises two minimums, so the previous deploy still works against the new database.
