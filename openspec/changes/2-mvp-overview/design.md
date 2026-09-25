# Design: Collabz MVP overview (#2)

## Context

The repo is greenfield: OpenSpec and the Claude Code workflow are set up, but there is no application code and `openspec/specs/` is empty. The brief (`collabz-mvp-brief.md`) suggests a stack and a scoring formula. See `proposal.md` for why the MVP exists and what is in and out of scope.

Constraints that shape everything below:
- **Two beginners, four weeks.** Prefer one codebase, managed services and boring, well-documented tools over anything clever.
- **Real students' data.** Emails and profiles of real people are stored, so privacy decisions are made up front, not bolted on.
- **Live test on one day.** Everyone signs up at roughly the same time from a QR code on their phones.

## Goals / Non-Goals

**Goals:**
- Settle the decisions that more than one slice depends on, so slices don't contradict each other.
- Fix a slice order where every slice ends in something deployed and checkable.

**Non-Goals:**
- Detailed requirements for any capability. Each slice writes its own spec in its own change.
- Choosing libraries that only one slice uses (e.g. the UI component approach). The slice that needs it decides.

## Decisions

### 1. Stack: the brief's suggestion, unchanged
Next.js (App Router) with API routes as the backend, Neon Postgres + Prisma, Auth.js email magic links, `react-force-graph`, and Vercel.
- *Why:* one TypeScript codebase and one deploy target. Prisma's `schema.prisma` gives us one readable file that describes all the data. Magic links mean we never store passwords.
- *Alternatives:* a separate Express API (two things to deploy and connect, which buys us nothing at this size); Supabase auth + database (bundles more, but moves us away from the brief and from the Neon tooling we already have).
- Magic links need an email-sending service. Slice 1 picks one (e.g. Resend) and checks that its free tier covers a whole cohort signing up within minutes.

### 2. Slices are vertical and each one is deployed
Build order: **1 auth → 2 onboarding → 3 matching → 4 graph → 5 connections → 6 safety.** Each slice ends deployed on Vercel with its success checks repeated on the live URL.
- *Why:* each slice needs the data from the one before it (you can't score profiles that don't exist). Deploying from slice 1 means demo day is not the first time the app runs on real infrastructure.
- *Alternative:* build everything locally and deploy at the end. That is the riskiest plan for a live test, so we rejected it.

### 3. Data shape (sketch, finalised in the slices)
```
User          id, email, acceptedTermsAt           (Auth.js also adds Account/Session/VerificationToken tables)
Profile       userId, course, silhouette, alias, heroStory, energy, vibe, qualities[], seeking[], completedAt
Edge          userAId, userBId, score, complement, overlap, tension   (one row per pair; userAId < userBId)
GlitchMatch   userId, matchedUserId
ConnectionRequest  fromUserId, toUserId, status (pending/approved/declined), createdAt
Block         blockerId, blockedId
Report        reporterId, reportedId, reason (picked from a list), createdAt
```
- The tag lists (12 options per exercise) live **in code** as fixed constants with stable ids, not in the database. *Why:* they never change at runtime, so code review is the right place to change them, and the database stores only ids.
- Each edge is stored once per pair (`userAId < userBId`). *Why:* the score is symmetric, so storing each pair once halves the rows and avoids two rows disagreeing.

### 4. Scoring runs when a profile is completed, for that user only
When a user finishes onboarding, the server scores them against every existing completed profile and inserts those edges. There is no scheduled job that recalculates everything.
- *Why:* a pair's score depends only on those two profiles, and profiles don't change after onboarding (see decision 7). So adding a new user never changes any existing edge. Scoring one user is roughly *N* small calculations, which takes milliseconds for a cohort-sized *N*.
- *Alternative:* the brief's "recompute job", which re-scores every pair. It isn't needed while profiles stay fixed. If editing profiles is added later, re-scoring that one user covers it.
- The **top 5** for a user is read by query at request time (their edges ordered by score), not stored. *Why:* the top 5 changes as people join, and a stored copy would go stale.
- **Ties** in the top 5 are broken by who completed their profile first. *Why:* the order has to be deterministic, or a user's "top 5" could change between page loads.

### 5. Identity on the graph: a generated alias, no names
Each profile gets an alias built from its own tags, e.g. *"The Feral Sea Captain"* (words from Vibe + Energy). A number is added if the alias is already taken (*"The Feral Sea Captain II"*). The alias is set once, at the end of onboarding.
- *Why:* it keeps the "no empty box" rule, gives people something memorable to point at on the graph, and keeps real identities hidden until both people agree to connect.
- *Alternatives:* typed first name (breaks the no-free-text rule and puts names on a public graph); silhouette only (nodes can't be told apart by eye in a cohort-sized graph).
- The exact word lists are a slice 2 detail.

### 6. Contact reveal = signup email only
Once a request is approved, each person sees the other's signup email. We collect no other contact data.
- *Why:* it needs no extra input, keeps to the no-free-text rule, and keeps the data we hold, and the data policy, as small as possible.

### 7. Profiles are fixed after onboarding for the MVP
There is no "edit profile" screen in the MVP.
- *Why:* it keeps scoring append-only (decision 4) and the graph stable during the live test. If someone needs to redo onboarding, we reset their profile by hand, which re-runs their scoring.

### 8. Course is recorded but not used for matching
Users pick "Software" or "Business" from a list during onboarding. Everyone is scored against everyone.
- *Why:* the team decided not to restrict matching. Recording course still lets us check on demo day that both cohorts took part. Whether to show it on the graph (e.g. node colour) is decided in slice 4.

### 9. Glitch match: random, assigned once, never yourself, never already in your top 5
At the end of scoring, a user gets one random completed profile that isn't them and isn't in their current top 5. If nobody qualifies yet (one of the first few users), they get one on a later user's completion.
- *Why:* "assigned once" means refreshing the page doesn't re-roll it. Excluding the top 5 means the glitch is always an extra person to contact, never a duplicate.
- A glitch edge is drawn with a different style/colour, as the brief says. Thickness still shows score.

### 10. Legal documents ship in slice 1
The T&C and data policy pages exist, and must be accepted, before anyone can create an account.
- *Why:* the first real sign-up is the moment we start holding personal data.

## Risks / Trade-offs

- **[A "full graph" of every pair becomes a hairball]** With *N* users there are about *N²/2* edges (≈ 5,000 at 100 users), and every pair of different Hero Stories scores at least 1. → Slice 4 tests with a seeded cohort of realistic size and chooses a rendering rule, e.g. drawing low-score edges faint, keeping the brief's "all edges" but readable.
- **[Anyone with the QR code/link can sign up]** → Accept for the MVP (it's a closed room on demo day); the data policy says who the app is for. Revisit if the link leaks.
- **[Magic-link email lands in spam or is slow on the day]** → Slice 1 tests delivery to the email providers students actually use, well before demo day.
- **[Group signup spike]** A whole room signing up at once. → Neon and Vercel handle this scale; scoring one user at a time (decision 4) keeps each completion cheap.
- **[Users choose zero Seeking or zero Qualities, so complement is always 0]** → Slice 2 decides whether at least one of each is required (see open questions).
- **[T&C / data policy written by students, not lawyers]** → Keep them short and honest about what is stored and why. Include a contact for deletion requests. Get course staff to look at them before the live test.

## Migration Plan

Not applicable: greenfield, no existing data. Each slice adds its own Prisma migrations. The data policy states when the test data will be deleted.

## Open Questions

These can each be settled in the named slice's own proposal without changing this plan:

- **Slice 1:** Which email-sending service? Do we limit sign-up to particular email domains?
- **Slice 2:** Must users pick at least one Quality and one Seeking tag? What are the alias word lists? What does the set of silhouettes look like, and where do the images come from?
- **Slice 4:** Is course shown on the graph? What is the edge-rendering rule for readability?
- **Slice 5:** In-app notification only, or also an email when a request arrives? Can a declined request be sent again?
- **Slice 6:** What happens to an already-revealed email when someone blocks? What are the report reasons, and who reads reports (Patrick and Tom, directly in the database)?
- **Data policy:** When is the live-test data deleted, and by whom?
