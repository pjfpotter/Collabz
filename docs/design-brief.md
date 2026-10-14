# Design brief: Collabz

Built from `openspec/specs/` and `ARCHITECTURE.md`, with tag names taken from `prisma/seed-data.ts`. Written on 14 Oct 2026 to hand to Claude Design. If the specs change, this brief may be out of date: the specs win.

---

## 1. What we're designing

**Collabz** is a mobile-first web app that matches software-course and business-course students by **chemistry, not CVs**. People build a profile entirely by picking from playful lists (no typing). The app scores every pair, shows the whole cohort as one live graph, and lets two people who both agree to connect open a private chat.

Design the full MVP interface: sign-up, onboarding, matches, graph, people and profiles, requests, messages, account, admin and safety screens, plus the shared navigation.

**Where we are:** the app works but is essentially unstyled (white or near-black background, Arial, a plain nav bar). This is a first real visual identity, not a refresh.

## 2. Audience and context

- About 30 students from two courses, **Software** and **Business**. Most are in their 20s and 30s, and many are career changers. Their stories include "Corporate Escapee" and "Late Bloomer".
- The cohort first meets the app by **scanning a QR code on a phone**, in a live in-room test. **Design phone-first at 375px.** The page must never scroll sideways. Desktop is the same layout given more room, not a different product.
- The cohort is small, so the graph is a main attraction rather than an admin chart.

## 3. Personality and tone

- **Playful and a bit self-mocking.** The content is deliberately like personality-test and astrology humour: *"Giving Sea Captain Energy"*, *"Rising Sign: Feral"*, *"Chaotic Neutral, But With A Spreadsheet"*, *"Currently In Their Villain Era"*. The UI should look like it's in on the joke while staying easy to use.
- **Warm, not corporate.** It should not look like LinkedIn or a dating app.
- **Safe and trustworthy underneath.** The privacy promises are real (see section 4), so the design should make them visible: aliases, silhouettes, "no email shown".
- Microcopy is plain English in short sentences. The existing copy already reads this way ("Why you match", "Waiting", "Connected").

## 4. Non-negotiable product rules the design must respect

1. **No free-text input in onboarding or profiles.** Every onboarding step is a selection from a list. The only free text anywhere is chat messages (max 1000 characters).
2. **Public identity = generated alias + picked silhouette avatar.** Examples: "The Feral Sea Captain". No email is ever shown to anyone. Photos are optional, private, and only visible after both people connect.
3. **You can only contact your top 5 matches and your one glitch match.** Search lets you *look at* anyone, but the Connect button appears only for those six.
4. **Connecting needs both people to agree.** Approval opens a chat. A decline is final for the pair.
5. **Blocked and suspended look the same to the sender.** There's no "this person blocked you" message.
6. **Scores are explained in plain sentences**, never shown as a naked number.

## 5. Visual direction (the designer decides, within these bounds)

- **Colour:** One vivid, memorable primary and a supporting accent. **Two course colours** are required (Software and Business). They must stay distinguishable from each other on the graph, in a legend, and for colour-blind viewers. Provide **light and dark themes** (the app already follows `prefers-color-scheme`).
- **Type:** One expressive display face for aliases and headings, with a highly legible body face. Alias names are long ("Giving Background-Character-Who's-Actually-The-Chosen-One Energy"), so layouts must handle wrapping and long strings.
- **Silhouette avatars:** Design a set of about 8 to 12 abstract, friendly, non-gendered silhouettes in a consistent style. Users pick one in onboarding, and it stands in for a face everywhere else. Each must work at small sizes (graph panel, list rows) and large (profile header).
- **Shape and motion:** Rounded, tactile, card-based. Light, purposeful motion only (a selected chip, a graph settling). Respect reduced-motion.
- **Tech constraints:** Next.js with Tailwind CSS 4. The graph is a **canvas** drawn by `react-force-graph-2d`, so graph styling must be expressible as colours, widths, dash patterns and node sizes, not DOM or CSS effects.

## 6. Shared components to design first

- **Navigation bar:** appears on every page. Home plus Matches, Graph, People, Requests, Messages, Account, and Admin (admins only). It must be fully usable at 375px (a bottom tab bar or a collapsing menu are both fine).
- **Requests count badge:** a number on the Requests link on every page, hidden when it is zero.
- **Signed-in status:** "Signed in as …" with Sign out. Visible on every page.
- **Dev switcher:** a "Dev sign-in as" dropdown. Style it as an obviously temporary dev strip, clearly separate from the real UI.
- **Tag chip / option card:** selectable, with a title and a one-line description. Needs states for default, selected, disabled (limit reached) and focus.
- **Course badge:** colour-coded Software or Business.
- **Alias + silhouette "person row" and "person card":** reused on matches, people, requests, messages and the graph panel.
- **Score and "why you match" list:** short sentences. Reasons are grouped as complement (each direction), shared energy or vibe, differing hero stories, and shared skills and interests (informational only).
- **Status pills:** Waiting, Connected, Declined.
- **Empty, error and "page not found" states:** the standard 404 is also what members see for admin pages and others' conversations.
- **Placeholder page:** names the page and the slice that will build it. Lower priority.

## 7. Screens

### Public
- **Home `/`:** Explain the idea in one screen and offer Sign up and Sign in. Link to the catalogue.
- **Catalogue `/catalogue`** (public, read-only): all 5 categories with their tags and descriptions in order. This doubles as a preview of what onboarding asks.
- **Terms `/terms` and Data policy `/privacy`:** long-form, readable, plain English. The data policy covers photos and messages, who sees them, and when they're deleted.

### Auth
- **Sign up `/signup`:** one form with email, a course picker (Software or Business) and a required Terms and Data policy checkbox with both links. Show clear errors for no course chosen and terms not accepted. After submit, show a "check your email" confirmation.
- **Finish sign-up `/signup/finish`:** the answers are pre-filled, with a one-tap confirm. This is the landing screen from the magic link.
- **Sign in `/signin`:** email only, with a magic link. Plain messages for: suspended account, used link, expired link (24 hours), and "no account yet, choose a course first".

### Onboarding `/onboarding` (7 pick steps plus avatar)
A guided, one-step-at-a-time flow with a progress indicator, because the cohort is on phones.

| Step | Category | Picks |
|---|---|---|
| 1 | Hero Story | 1 of 12 ("The Late Bloomer", "The Accidental Founder"…) |
| 2 | Energy | 1 of 12 ("Giving Golden Retriever CEO Energy"…) |
| 3 | Vibe Diagnosis | 1 of 12 ("Rising Sign: Feral"…) |
| 4 | Qualities | up to 4 of 12 ("Actually finishes the thing"…) |
| 5 | Seeking | up to 4 of 12 ("Someone who matches my chaos"…) |
| 6 | Skills | up to 4 (e.g. Back-end, Data, UX/design) |
| 7 | Interests | up to 4 (e.g. Climate) |
| + | Silhouette | pick 1 avatar |

Design a step screen that shows each option's description, handles the "pick up to N" counter, supports back and forward, and ends on a "your profile is ready" moment with the generated bio.

### Matches `/matches`
- **Top 5** in rank order. Each card shows alias, silhouette, course, score and a short plain-sentence reason.
- **Glitch match** drawn *differently* from the top 5, labelled as a surprise.
- If the user has no finished profile, redirect them to onboarding (no screen needed).
- Fewer than five matches must look intentional, not broken.

### Graph `/graph` (the hero screen)
- Every finished, unsuspended person is a **node**. Every score is an **edge**.
- **Course colour per node, with a legend.**
- **Edge strength:** stronger score means thicker, darker and pulled closer. Weak edges are faint. All edges are drawn, so legibility comes from weight and fade. The full cohort is about 29 nodes and 406 edges and must remain readable.
- **Highlighting:** your own node, your top 5 and your glitch match are visibly marked, and the edges to them stand out.
- **Glitch edge is dashed** (pattern, not thickness; thickness still follows the score).
- **Tap a node** and a small panel shows alias, silhouette, course, score with you, and a "View profile" link. The tap doesn't open the profile directly.
- **Drag a node** and it stays where you drop it (capped at 2x the graph's radius) until reload. Show a hint for this.
- **Pan, pinch-zoom and tap** on touch.
- **A text list below** the graph names your top 5 (in score order) and your glitch match, each linking to a profile. This is also the accessible alternative to the canvas.
- **Filter state:** when arriving from People with a filter, matching people are highlighted and everyone else is dimmed.

### People `/people`
- **Filters:** three single-select dropdowns (Course, Skill, Interest) that combine. Include a one-step "clear filters".
- **List:** all other finished profiles, strongest score first. Each row shows alias, silhouette, course and score.
- **Zero results:** "nobody matches" with a clear-filters action.
- **"Show these on the graph"** action that carries the filter across.

### Profile `/people/[alias]`
- **Header:** silhouette (photo only if connected and uploaded), alias, course, and a "your glitch match" tag where applicable.
- **Generated bio** in plain sentences, plus **tags grouped by category**. Retired tags still show.
- **"Why you match"** breakdown with the score. Hidden on your own profile.
- **Connect area**, with exactly these states:
  - Connect button (top 5 or glitch match only)
  - No action (anyone else)
  - "Waiting" or "Connected" status
  - Own profile: no breakdown and no action
- **Safety actions:** Block and Report (with a fixed reason list).

### Requests `/requests`
- **Waiting for me:** each shows alias, silhouette, profile link, and Approve and Decline.
- **Sent by me:** each shows alias plus a status of Waiting, Connected or Declined.
- Never show email.

### Messages `/messages` and `/messages/[conversationId]`
- **Conversation list:** alias, silhouette, last activity.
- **Thread:** messages show sender alias and time, with a composer limited to 1000 characters (a counter, and a "too long" error). An empty message is refused.
- **Closed conversation** (after a block): readable, with the composer replaced by a clear "this conversation is closed" notice.
- Messages refresh on page load. Real-time chat is a later stretch, so don't depend on it.

### Account `/account`
- View your own profile, change course, **edit any onboarding answer** using the same pick controls (saving triggers a rescore, with the alias unchanged), sign out.
- **Photo:** upload, replace or remove one photo, with a clear line that it's "only visible to people you've connected with".
- Placeholders for *Privacy settings* and *Delete account / export data* (later).

### Admin (admins only, can be denser and desktop-leaning)
- **`/admin`:** manage categories, tags and courses (add, rename, reorder, retire, never delete). Adding a Quality or Seeking tag requires choosing which tags in the other category it pairs with. Also manage users (list, view profile, suspend and unsuspend, reset onboarding, remove photo). The dashboard stats (sign-ups by course, approved connections, active conversations in 7 days) are a later feature.
- **`/admin/reports`:** the moderation queue (open and resolved). Each row shows reporter, reported user and reason, with actions Suspend, Remove photo and Mark resolved.

## 8. States every screen needs

Loading, empty, error, and the "signed out" and "unfinished profile" redirects (these are redirects, so they need little design). Also design the **standard "page not found"** page, which is intentionally used when a member opens an admin page, someone else's conversation, a suspended person or an unknown alias.

## 9. Accessibility and quality bar

- Phone-width layouts first (375px), with no horizontal scroll.
- Touch targets of at least 44px.
- WCAG AA contrast in both themes.
- Never rely on colour alone. The two course colours and the dashed glitch edge need shape or text backup.
- The graph needs a text equivalent (the list below it), and every control must be keyboard reachable.
- Respect `prefers-reduced-motion`.

## 10. Out of scope (don't design yet)

Notifications, icebreaker suggestions, real-time chat, favourites, events, the project ideas board, privacy settings, account deletion and admin stats. These are all marked "Later" in the spec. A subtle placeholder is fine where one naturally sits (for example, the account page).

## 11. What we want back

1. A design language (colour tokens for light and dark, type scale, spacing, radii, elevation).
2. The silhouette avatar set and the two course colours.
3. The shared components from section 6, with all their states.
4. Mobile and desktop designs for: Onboarding (one step plus the finish screen), Matches, Graph (including the node panel), Profile (all four connect states), Messages thread, and Sign up.
5. A short rationale for the graph's visual encoding (thickness, fade, dash and highlight), since that's the part most likely to go wrong at 29 nodes and 406 edges.

---

## Open points to settle first

- The exact list of Skills and Interests isn't in the seed yet (slice 2 adds them), so those onboarding steps show placeholder names for now.
- The spec doesn't say how many silhouettes there should be. 8 to 12 is suggested.
- Top bar or bottom tab bar for the nav on phones is left open.
