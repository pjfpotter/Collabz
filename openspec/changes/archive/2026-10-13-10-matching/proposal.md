# Proposal: Slice 3, chemistry matching (#10)

## Why

The brief's whole promise is "matches come from chemistry, not CVs", but today nothing calculates chemistry. `scoreUser()` is an empty stand-in, the `Edge` table only holds invented numbers from the pretend cohort, and the `/matches` page is a placeholder. Slice 4 (graph, search) and slice 5 (requests) already read scores and a top 5 through stand-in functions, so until this slice lands the app can only show pretend data.

## What Changes

- **The score formula as one small, pure function** (no database): `(complement × 3) + overlap + tension`, exactly as written in the brief. Complement counts Seeking↔Quality pairings in both directions, overlap is +1 for the same Energy and +1 for the same Vibe Diagnosis, tension is +1 when the Hero Stories differ. Skills, Interests and course never enter it.
- **The Seeking↔Quality pairings become data.** 12 Seeking tags are paired with the Quality tags that satisfy them, stored as `TagPairing` rows and seeded by `prisma/seed.ts`. The `TagPairing` table already exists from the foundation; this slice fills it. The pairing list is **drafted in `design.md` for the team to edit before approval** (the issue lists this as an open question).
- **`scoreUser(userId)` is filled in.** It deletes only that user's `Edge` rows, scores them against everyone with a finished profile, writes the new rows, and gives them a glitch match if they don't have one. Nobody else's scores change.
- **Top 5 query**, `getTopFive(userId)`: highest score first; ties go to whoever finished their profile first, then the lower user id, so the list is the same on every page load. Suspended and unfinished people are left out.
- **Glitch match rules**: one per user, never yourself, never someone in your top 5, never a suspended person, and it is stored (`GlitchMatch`) so it doesn't change on refresh.
- **"Why you match" breakdown**, `explainMatch(userAId, userBId)`: one plain sentence per part of the score, plus shared Skills and Interests listed for information only.
- **A `/matches` page** replacing the placeholder: your top 5 with score and a short reason each, your glitch match shown differently, and a link to each person's profile.
- **A catch-up command for existing data**: `npm run rescore:all` recalculates every edge with the real formula, because the pretend cohort's edges were invented, not calculated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `chemistry-matching`: adds requirements for the glitch match rules, the deterministic top 5 and its tie-break, how the Seeking↔Quality pairings are stored and seeded, and the `/matches` page. The existing score, rescore and explain requirements stay as they are.

## Impact

- **Depends on #7 only** (foundation tables, `scoreUser` stub, pretend cohort). It does not wait for sign-up (#8) or onboarding (#9): it is built and tested against the pretend cohort, and onboarding already calls `scoreUser` after a save.
- **Schema:** no change planned. `Edge`, `GlitchMatch` and `TagPairing` already exist. If a column turns out to be missing (for example to remember *why* a glitch match was chosen), it is flagged to Patrick first, per the ground rules in #18.
- **Code (new):** `src/lib/matching/` (formula, pairings loader, top 5, glitch pick, explain), `src/app/matches/` (page), additions to `prisma/seed.ts` and `prisma/seed-data.ts`, a rescore script.
- **Code (filled in):** `src/lib/scoring.ts` (`scoreUser` keeps its name and signature, so every caller keeps working).
- **Routes owned:** `/matches` only.
- **Join-up (#17):** slice 4's `src/lib/cohort/standIns.ts` replaces its `getTopFive` and `explainMatch` stand-ins with this slice's functions. Their names here are the ones that file already proposes, but track 4 must confirm them.
- **Out of scope:** match notifications and AI icebreakers (MVP Later), drawing the graph (slice 4), sending requests (slice 5).
