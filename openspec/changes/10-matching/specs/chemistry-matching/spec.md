# Spec Delta

## ADDED Requirements

### Requirement: Seeking and Quality pairings are stored as data
The system SHALL store which Seeking tag is satisfied by which Quality tag as records in the database, and SHALL use only those records when counting complement. The seed SHALL add missing pairings without overwriting or removing any that already exist.

**Brief:** Essential ("a matching algorithm") · **MVP:** In · **Thursday:** Out

#### Scenario: Pairings are seeded
- **WHEN** the seed runs against a database that has the Seeking and Qualities tags
- **THEN** every Seeking tag has at least one paired Quality tag, and every pairing refers to a Seeking tag and a Quality tag that exist

#### Scenario: Re-seeding keeps database edits
- **WHEN** a pairing has been removed in the database and the seed runs again
- **THEN** the seed only adds pairings that are missing, so nothing already stored is changed or duplicated

#### Scenario: Complement follows the stored pairings
- **WHEN** A seeks a tag that is paired with a Quality B has picked, and B seeks nothing that A offers
- **THEN** the complement count for the pair is 1

### Requirement: Only finished, active profiles are scored
The system SHALL calculate scores only between users whose onboarding is complete, and a user with an unfinished profile SHALL have no scores and SHALL NOT appear in anyone's top 5 or as anyone's glitch match.

**Brief:** Essential · **MVP:** In · **Thursday:** Out

#### Scenario: Unfinished profile is skipped
- **WHEN** user A is rescored while user B has not finished onboarding
- **THEN** no score between A and B is stored

#### Scenario: Newcomer is scored against everyone
- **WHEN** a user finishes onboarding and 29 other users have finished profiles
- **THEN** 29 scores involving that user are stored, one per pair

### Requirement: Top 5 is the same on every page load
The system SHALL rank a user's matches by score, highest first, and SHALL return at most five. Equal scores SHALL be ordered by who finished their profile first, and then by the lower user id. A suspended user SHALL NOT be included.

**Brief:** Essential ("top-5 contactable matches") · **MVP:** In · **Thursday:** Out

#### Scenario: Ties are broken by who finished first
- **WHEN** two people have the same score with user A and one of them finished onboarding earlier
- **THEN** the earlier finisher is ranked above the other

#### Scenario: Same answer every time
- **WHEN** user A's top 5 is requested twice without any profile changing in between
- **THEN** both results list the same people in the same order

#### Scenario: Fewer than five people available
- **WHEN** only three other people have finished profiles
- **THEN** the top 5 lists those three

### Requirement: Every finished user has one stable glitch match
The system SHALL give each user with a finished profile at most one glitch match, chosen at random from other active users with finished profiles. The glitch match SHALL NOT be the user themselves and SHALL NOT be anyone in their top 5. It SHALL be stored, so it does not change when pages are reloaded or when the user is rescored.

**Brief:** Essential ("glitch match") · **MVP:** In · **Thursday:** Out

#### Scenario: Never yourself, never in the top 5
- **WHEN** a glitch match is chosen for user A
- **THEN** it is a different person from A and is not one of A's five best matches

#### Scenario: Does not change on reload or rescore
- **WHEN** user A already has a glitch match and A's matches page is opened again, or A is rescored
- **THEN** A's glitch match is the same person as before

#### Scenario: Replaced when it is no longer valid
- **WHEN** A's glitch match is suspended
- **THEN** A is given a new glitch match that follows the same rules

### Requirement: Matches page shows top 5 and glitch match
The system SHALL show a signed-in user with a finished profile their top 5 matches, with score and a short reason each, and their glitch match shown differently from the top 5. A user without a finished profile SHALL be sent to onboarding instead.

**Brief:** Essential · **MVP:** In · **Thursday:** Out

#### Scenario: Matches page content
- **WHEN** a signed-in user with a finished profile opens `/matches`
- **THEN** they see up to five matches in rank order, each with a score and a reason, and one glitch match marked as a surprise

#### Scenario: No profile yet
- **WHEN** a signed-in user who has not finished onboarding opens `/matches`
- **THEN** they are sent to onboarding and no matches are shown

#### Scenario: Nobody else's real name is shown
- **WHEN** the matches page lists people
- **THEN** each is shown by alias and silhouette only, never by email or photo
