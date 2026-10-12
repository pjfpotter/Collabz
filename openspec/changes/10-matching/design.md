# Design: Slice 3, chemistry matching (#10)

## Context

See `proposal.md` for why. What is already in place, from reading the code on `master`:

- **Tables exist** (foundation #7): `Edge` (one row per pair, with `score`, `complement`, `overlap`, `tension`), `GlitchMatch` (one row per user) and `TagPairing` (a seeking tag id and a quality tag id). `TagPairing` is empty today.
- **`scoreUser(userId)` is a stub** in `src/lib/scoring.ts`. It already has its final name and `async` signature; the sign-up/onboarding code is meant to call it after a save.
- **Pair order**: `orderUserPair()` in `src/lib/userPair.ts` puts the lower user id in `userAId`. Every read or write of `Edge` goes through it.
- **Slice 4 left stand-ins** in `src/lib/cohort/standIns.ts`: `getTopFive(userId)` returning `{ userId, score }[]`, and `explainMatch(userAId, userBId)` returning `{ score, sentences, sharedSkills, sharedInterests }`. The stand-in `getTopFive` already has the tie-break this spec asks for. This slice should produce functions with the same names and shapes, so join-up is a swap, not a rewrite.
- **The pretend cohort's edges were invented** by `prisma/pretend-cohort.ts`, not calculated. Real scoring replaces them.
- **Settled rules** (`openspec/config.yaml`): everyone is scored against everyone, course is not scored, scores are stored per pair and recalculated only for the user who changed, Skills and Interests are not scored.

## Goals / Non-Goals

**Goals:**
- A formula a beginner can read in one screen and check by hand against the brief.
- `scoreUser` that changes only the rows involving one user.
- Top 5 and glitch match that are the same on every page load.
- Everything buildable and testable against the pretend cohort, without waiting for sign-up or onboarding.

**Non-Goals:**
- Notifications and icebreakers (MVP Later).
- Drawing the graph, or sending requests (slices 4 and 5 own those).
- Making scoring fast for thousands of users. A cohort is about 30 to 100 people (see decision 4).

## Decisions

### 1. The formula is a pure function with no database

`calculateScore(a, b, pairings)` in `src/lib/matching/score.ts` takes two plain objects (each person's picked tag ids, grouped by category) and the pairings, and returns `{ score, complement, overlap, tension }`. It never touches the database.

*Why:* it can be tested with a hand-worked example from the brief in a few lines, which is the first success check in #10. *Alternative considered:* scoring inside a SQL query. Rejected: harder for beginners to read and to unit test.

### 2. Complement counts satisfied Seeking tags, not pairing rows

For each direction, complement counts how many of one person's Seeking tags are satisfied by **at least one** of the other person's Quality tags. A Seeking tag with two pairings still counts once. Both directions are added, so the most a pair can score is 4 + 4 = 8 complement.

*Why:* the brief says "count how many of A's Seeking tags match B's Qualities". Counting pairing rows instead would let a Seeking tag with more pairings count for more, which would quietly favour some tags. *Alternative:* count every matching pairing row. Rejected for that unfairness. *Ceiling check:* with the 4-pick limit the maximum score is 8 × 3 + 2 + 1 = 27.

### 3. The pairings are drafted here and edited by the team before approval

12 Seeking tags, each paired with two Quality tags (24 rows). This is **a draft for the team to change**, in the same way slice 2's tag lists were: the wording of the tags only implies the pairings.

| Seeking | Is satisfied by (Qualities) |
|---|---|
| Someone who can actually make money happen | Knows someone who knows someone · Makes the room believe it too |
| Someone who finishes what I start | Actually finishes the thing · Keeps the whole operation from falling over |
| Someone who tells me when the idea is bad | Says the hard thing kindly · Notices the thing everyone else missed |
| Someone who makes it real with their hands | Builds it with their actual hands · Turns fog into a floor plan |
| Someone who makes the boring bits happen | Keeps the whole operation from falling over · Actually finishes the thing |
| Someone who believes it before there's proof | Makes the room believe it too · Keeps going after the tenth "no" |
| Someone who already knows the room | Knows someone who knows someone · Makes the room believe it too |
| Someone who stays when it gets hard | Stays calm when everyone else is not · Keeps going after the tenth "no" |
| Someone who makes it look as good as it is | Makes it beautiful on purpose |
| Someone who asks the annoying smart questions | Notices the thing everyone else missed · Goes deep when it matters |
| Someone who matches my chaos | Goes deep when it matters · Keeps going after the tenth "no" |
| Someone who's done this before | Knows someone who knows someone · Turns fog into a floor plan |

Stored as `TagPairing` rows and seeded in `prisma/seed-data.ts` by tag id (the ids are stable, rule B2). The seed uses `createMany` with `skipDuplicates`, so a re-seed adds what is missing and never removes or overwrites. "Matches my chaos" is the weakest pairing and the one most worth arguing about.

### 4. `scoreUser` loads the whole cohort once and works in memory

Steps, all inside one database transaction:

1. Load every visible person's picked tag ids in one query (finished profile, not suspended).
2. Load all `TagPairing` rows.
3. For each other person, call `calculateScore`.
4. Delete this user's `Edge` rows (either side), then `createMany` the new ones with `skipDuplicates`.
5. Make sure they have a valid glitch match (decision 5) and repair anyone whose glitch match is now invalid.

*Why in memory:* at 30 to 100 people that is a few thousand rows and takes milliseconds, and the code reads top to bottom. This is the same approach slice 4 took for `getVisiblePeople`. *Why `skipDuplicates`:* if two people finish at the same moment, each writes the shared pair row, and since both compute it from the same answers the values are equal, so the second write can simply be ignored. *Why one transaction:* a failure halfway must not leave the user with half their scores. Callers still call `scoreUser` **after** their own save, so a scoring problem can never undo the user's work (as the stub's comment already says).

A user who is not finished or is suspended has their edges deleted and gets nothing new, so they drop out of everyone's top 5.

### 5. Glitch match: random, stored, kept while still valid

- **Choice:** pick at random from visible people who are not the user and not in their top 5. The random source is passed in as a parameter, so tests can make it repeatable; production passes `Math.random`.
- **Stored** in `GlitchMatch`, so reloads never change it.
- **Kept while valid.** On every rescore of the user it is kept unless the person is now suspended, unfinished, or has entered the top 5, in which case a new one is chosen. This answers the open question from #10 ("what happens to a glitch match on rescore"); the team should confirm (task 1.2).
- **Repairing other people's:** rescoring A can push A into B's top 5, and A may be B's glitch match. Step 5 above looks up `GlitchMatch` rows pointing at A and replaces any that are now in the owner's top 5.
- **Too few people:** if nobody is eligible (a cohort under 7), the user has no glitch match yet and the page says so. `/matches` calls `ensureGlitchMatch(userId)` when the row is missing, so someone who finished early gets one once the cohort grows. That call changes nothing if one already exists.

*Alternative:* derive the glitch match from a hash of the user id so it never needs storing. Rejected: it could not respect "never in the top 5" after scores change, and the schema already has a table for it.

### 6. Visibility rule is repeated here, on purpose

Matching needs "finished profile and not suspended". Slice 4 owns `getVisiblePeople` in `src/lib/cohort/`, but CLAUDE.md says tracks reach each other only through the shared helpers, so this slice does its own small query in `src/lib/matching/eligiblePeople.ts` with a comment pointing at the other. Join-up can merge the two. *Cost:* the rule is written twice. *Why accepted:* importing another track's internals is the thing the ground rules forbid.

### 7. Public function names and shapes match slice 4's stand-ins

`getTopFive(userId)` and `explainMatch(userAId, userBId)` are exported from `src/lib/matching/index.ts` with the same return shapes as the stand-ins, plus `scoreUser` (unchanged) and `ensureGlitchMatch`. Slice 4's file calls these names "track 4's proposal, not agreed yet", so task 1.2 confirms them with track 4.

### 8. Explanation sentences are built from tag names

`explainMatch` produces one sentence per part of the score, for example *"You're after 'Someone who finishes what I start', and they 'Actually finish the thing'."*, *"You share the same Energy"*, *"Your Hero Stories differ, which adds some spark"*. Shared Skills and Interests are returned in separate lists, marked for information only (rule B5). It re-uses `calculateScore`'s pieces, so the words can never disagree with the number.

### 9. `/matches` is a Server Component that only reads

Signed-out visitors go to sign-in. A signed-in user without a finished profile is sent to `/onboarding`, using a one-line check until slice 2's `redirectIfOnboardingIncomplete()` is merged (join-up item). The page shows alias and silhouette only, never email or photo (rule B1). The glitch match is drawn with a different label and style from the five matches, matching the graph's "different style, not thickness" rule.

### 10. A rescore-everything command

`npm run rescore:all` loops over every visible person and calls `scoreUser`. Run once after this slice lands so the pretend cohort's invented scores become real ones, and available afterwards if the pairings are edited. It never prints the database address (secrets rule).

## Risks / Trade-offs

- **The pairings are a judgement call and change every score** → they live in data, not code, so an edit plus `rescore:all` fixes them; the team agrees the draft before apply (task 1.1).
- **Rescoring after each save is O(people)** → fine at 100 people; if the cohort ever reaches thousands, this needs a background job (out of scope).
- **Two code paths for visibility** (decision 6) → noted for join-up, and a test in this slice pins the rule so a drift would show.
- **Pretend-cohort tests may assume invented scores** → check existing tests (`graphData`, `search`, `seed-fake`) before replacing edges; the tasks include running them.
- **Random glitch match makes tests flaky** → the random source is a parameter (decision 5).

## Migration Plan

1. Seed the pairings on `dev` (re-seed is safe).
2. Run `npm run rescore:all` on `dev`, check `/matches` as a few pretend users.
3. On the preview deploy repeat the checks, then run the rescore on the preview database. No schema migration is needed, so nothing to roll back beyond re-running the rescore with the old pairings.

## Open Questions

- How the matches page links to a profile (`/people/<alias address>`): reuse slice 4's `aliasToAddress` or wait for the join-up? Answerable at apply time without changing the specs.
