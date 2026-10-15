# Spec Delta

## Purpose

Lets anyone try the cohort graph without an account, using an invented cohort and a pick-your-own-tags picker, so students can see and play with the idea on their phones from a QR code.

## ADDED Requirements

### Requirement: The demo is open to everyone and independent of real data
The page at `/demo/graph` SHALL be reachable without signing in, SHALL work on the live site, and SHALL NOT read the database, any real person's data, or depend on the pretend cohort being switched on.

**Brief:** Supporting · **MVP:** In · **Thursday:** In

#### Scenario: A visitor with no account
- **WHEN** someone who is not signed in opens `/demo/graph`
- **THEN** the graph is shown with its invented people

#### Scenario: Production with no pretend cohort
- **WHEN** the app runs with the pretend cohort switched off, as in production
- **THEN** `/demo/graph` still shows the full invented cohort

#### Scenario: A signed-in student sees the same demo
- **WHEN** a signed-in student opens `/demo/graph`
- **THEN** they see the same invented people as a visitor, and no alias, tag, score or email from the database

### Requirement: The demo cohort is invented, varied and plainly named
The demo SHALL show about 40 invented people on both the software and business courses, each with an alias, a silhouette and tags taken from the real tag catalogue. No alias or label SHALL contain the word "Pretend".

**Brief:** Supporting · **MVP:** In · **Thursday:** In

#### Scenario: Names look like the real thing
- **WHEN** a visitor reads the aliases on the demo graph
- **THEN** each reads like a real alias (for example "The Feral Gremlin") and none contains "Pretend"

#### Scenario: Both courses appear
- **WHEN** the demo graph is drawn
- **THEN** people from both courses are visible and told apart by the same shapes and colours as the real graph

### Requirement: A visitor can be someone and see where they fit
The demo SHALL let a visitor pick tags for themselves, within the same pick limits as onboarding, and SHALL then score every invented person against them with the real chemistry formula. It SHALL highlight their top 5 and one glitch match, show why people match, and place the visitor on the graph. Nothing picked SHALL be saved or sent anywhere.

**Brief:** Core · **MVP:** In · **Thursday:** In

#### Scenario: Picking changes the graph
- **WHEN** a visitor picks a Hero Story, an Energy, a Vibe and some Qualities and Seeking tags
- **THEN** the graph shows them as the viewer, with their top 5 highlighted and one glitch match drawn differently

#### Scenario: Picking different tags gives different matches
- **WHEN** the visitor changes their tags
- **THEN** the scores, top 5 and "why you match" reasons update to match the new tags

#### Scenario: Nothing is kept
- **WHEN** the visitor reloads the page
- **THEN** their picks are gone and the demo starts from the unpicked state

#### Scenario: Pick limits hold
- **WHEN** a visitor has picked the most tags a category allows
- **THEN** they cannot add another one in that category

### Requirement: The demo works with a finger on a phone
The demo SHALL be usable on a phone-width screen: the graph can be tapped and dragged, tapped people open a panel, and the picker is reachable without leaving the page.

**Brief:** Core · **MVP:** In · **Thursday:** In

#### Scenario: Phone width
- **WHEN** a visitor opens `/demo/graph` at 375px wide
- **THEN** nothing overflows sideways, the graph is drawn, and the picker can be opened and closed

#### Scenario: Tapping a person
- **WHEN** a visitor taps a person on the graph
- **THEN** a panel shows their alias, silhouette, course, tags and why they match the visitor

### Requirement: The demo offers nothing that needs an account
The demo SHALL NOT offer Connect, messaging, photos or links to real profile pages. It SHALL say in words that the people are invented and that nothing is saved, and SHALL link to sign up.

**Brief:** Supporting · **MVP:** In · **Thursday:** In

#### Scenario: No account actions
- **WHEN** a visitor taps any person in the demo
- **THEN** no Connect button and no link to a profile page is shown

#### Scenario: The demo says what it is
- **WHEN** a visitor reads the page
- **THEN** it states that the people are made up and nothing they pick is saved, and a sign-up link is present
