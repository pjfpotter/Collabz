# Spec Delta

## MODIFIED Requirements

### Requirement: Profiles are built only from picks
Onboarding SHALL consist of seven pick-from-list exercises: Hero Story (pick 1), Energy (pick 1), Vibe Diagnosis (pick 1), Qualities (1 to 4), Seeking (1 to 4), Skills (1 to 4) and Interests (1 to 4). The user also picks a silhouette avatar. Onboarding and the public profile SHALL contain no free-text input. Only active (not retired) tags SHALL be offered. The minimum and maximum picks for each exercise SHALL be read from the catalogue, not fixed in code.

**Brief:** Essential ("skills, interests, and what they're looking for") · **MVP:** In · **Thursday:** Out

#### Scenario: Skills and interests captured
- **WHEN** a user picks "Back-end" and "Data" as Skills and "Climate" as an Interest
- **THEN** their completed profile lists those skills and that interest

#### Scenario: No typing anywhere
- **WHEN** a user goes through all of onboarding
- **THEN** every step is a selection from a list, and there is no text box

#### Scenario: Cannot go past the maximum
- **WHEN** a user has picked 4 Qualities and tries to pick a fifth
- **THEN** the fifth is not selected, and they are told the limit is 4

#### Scenario: Cannot skip a category
- **WHEN** a user has picked no Interests
- **THEN** they cannot move on from the Interests step

#### Scenario: Retired tags are not offered
- **WHEN** a tag has been retired in the catalogue
- **THEN** it does not appear in its onboarding step

## ADDED Requirements

### Requirement: Users without a finished profile are sent to onboarding
A signed-in user whose profile is not complete SHALL be sent to `/onboarding` when they open a page that needs a finished profile. A user whose profile is already complete SHALL NOT be able to go through onboarding again; opening `/onboarding` SHALL take them to their finished profile instead. A visitor who is not signed in SHALL be sent to sign in.

**Brief:** Essential (profiles) · **MVP:** In · **Thursday:** Out

#### Scenario: New user is sent to onboarding
- **WHEN** a signed-in user with no completed profile opens a page that needs one
- **THEN** they are taken to `/onboarding`

#### Scenario: Finished user is not onboarded twice
- **WHEN** a user with a completed profile opens `/onboarding`
- **THEN** they are taken to their finished profile, and their answers are unchanged

#### Scenario: Visitor who is not signed in
- **WHEN** someone who is not signed in opens `/onboarding`
- **THEN** they are sent to sign in

### Requirement: Answers are checked and saved all at once
The server SHALL save a user's onboarding only when every exercise is within its pick limits, every picked tag is active and belongs to that exercise's category, and the silhouette is one of the offered set. Otherwise it SHALL save nothing and say what is wrong. A valid save SHALL store all answers together and mark the profile complete, so a profile is never left half-saved.

**Brief:** Essential (profiles) · **MVP:** In · **Thursday:** Out

#### Scenario: Valid answers are saved
- **WHEN** a user submits answers within every limit and a valid silhouette
- **THEN** their profile is saved with all their tags and is marked complete

#### Scenario: Invalid answers are rejected by the server
- **WHEN** a request reaches the server with 5 Seeking tags, or a tag from the wrong category, or a retired tag
- **THEN** nothing is saved and the user is told which step to fix

#### Scenario: Scores are refreshed on completion
- **WHEN** a user completes onboarding
- **THEN** the system recalculates that user's scores (see `chemistry-matching`)

### Requirement: Generated alias is unique
When onboarding is completed, the system SHALL give the user an alias made of "The", a word from their Vibe Diagnosis tag and a word from their Energy tag. If that alias is already taken, the system SHALL add the next Roman numeral (II, III, …) so that no two users share an alias. The alias SHALL be set once and SHALL NOT change afterwards.

**Brief:** Essential (profiles) · **MVP:** In · **Thursday:** Out

#### Scenario: Alias from the user's own tags
- **WHEN** a user whose Vibe tag has the alias word "Feral" and whose Energy tag has the alias word "Sea Captain" completes onboarding
- **THEN** their alias is "The Feral Sea Captain"

#### Scenario: Two users would get the same alias
- **WHEN** "The Feral Sea Captain" is already taken and another user with the same Vibe and Energy completes onboarding
- **THEN** the second user's alias is "The Feral Sea Captain II"

#### Scenario: A tag has no alias word
- **WHEN** a user picks an Energy or Vibe tag that has no alias word (for example, one an admin added later)
- **THEN** they still get a readable alias, using a standard fallback word in its place

### Requirement: Silhouettes come from a fixed set
The user SHALL choose exactly one silhouette from a fixed set of 12 shown as pictures. The chosen silhouette SHALL be shown with their alias wherever their public identity appears.

**Brief:** Essential (profiles: "photo", via B3) · **MVP:** In · **Thursday:** Out

#### Scenario: Silhouette chosen
- **WHEN** a user picks the third silhouette and completes onboarding
- **THEN** their finished profile shows that silhouette next to their alias

#### Scenario: No silhouette chosen
- **WHEN** a user has not picked a silhouette
- **THEN** they cannot complete onboarding
