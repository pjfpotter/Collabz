# Spec Delta

## MODIFIED Requirements

### Requirement: Filter people by course, skill and interest
A signed-in user with a finished profile SHALL be able to filter all finished profiles at `/people` by course, skill and interest, picking at most one of each from a list. Chosen filters SHALL combine, so a person is listed only if they match every one. The viewer, suspended users and unfinished profiles SHALL NOT be listed. The same filter SHALL be able to be carried to the graph, where matching people are highlighted. Any result's profile can be opened.

**Brief:** Essential ("find people by filters") · **MVP:** In · **Thursday:** Out

#### Scenario: Filter by skill
- **WHEN** a user filters by Skill "UX/design"
- **THEN** only profiles with that skill are listed and highlighted on the graph

#### Scenario: Filter by course
- **WHEN** a user filters by course "Business"
- **THEN** only Business students are listed

#### Scenario: Filter by interest
- **WHEN** a user filters by Interest "Climate"
- **THEN** only profiles with that interest are listed

#### Scenario: Filters combine
- **WHEN** a user filters by course "Software" and Skill "Data"
- **THEN** only Software students who have the skill "Data" are listed

#### Scenario: No filter chosen
- **WHEN** a user opens `/people` without choosing a filter
- **THEN** every other finished, unsuspended profile is listed, strongest score with the viewer first

#### Scenario: Nobody matches
- **WHEN** no profile matches the chosen filters
- **THEN** the user is told nobody matches, and can clear the filters in one step

#### Scenario: Same filter on the graph
- **WHEN** a user who has filtered by Skill "Data" chooses to see the results on the graph
- **THEN** the graph opens with the people who have that skill highlighted and everyone else dimmed

#### Scenario: Only tags in use are offered
- **WHEN** a skill has been retired in the catalogue
- **THEN** it is not offered as a filter choice

### Requirement: Search does not widen who can be contacted
Opening a profile found through search SHALL show the "why you match" breakdown. A "Connect" action SHALL be offered only if that person is in the viewer's top 5 or is their glitch match, and the server SHALL refuse a connection attempt for anyone else, however it is sent. A user's own profile SHALL show neither the breakdown nor the action.

**Brief:** Essential (search) · **MVP:** In · **Thursday:** Out

#### Scenario: Found person outside top 5
- **WHEN** a user opens the profile of someone found by filter who is not in their top 5 and is not their glitch match
- **THEN** they see the profile and the breakdown, and no "Connect" action

#### Scenario: Person in the top 5
- **WHEN** a user opens the profile of someone in their top 5
- **THEN** they see the profile, the breakdown and a "Connect" action

#### Scenario: Glitch match
- **WHEN** a user opens the profile of their glitch match
- **THEN** they see a "Connect" action, and the profile says this person is their glitch match

#### Scenario: Direct attempt for someone outside the top 5
- **WHEN** a connection attempt for a person outside the viewer's top 5 and glitch match is sent straight to the server
- **THEN** the server refuses it and nothing is stored

#### Scenario: Already requested or connected
- **WHEN** a pending or approved connection request already exists between the viewer and the person
- **THEN** the profile shows that status in place of the "Connect" action

#### Scenario: Own profile
- **WHEN** a user opens their own profile page
- **THEN** they see their profile with no breakdown and no "Connect" action

## ADDED Requirements

### Requirement: Each person has a profile page at their own address
Every user with a finished profile who is not suspended SHALL have a profile page at `/people/` followed by a readable form of their alias. A signed-in user with a finished profile SHALL see there the person's alias, silhouette, generated bio, course and tags grouped by category, and no email. An address that matches nobody SHALL show the standard "page not found" page.

**Brief:** Essential (profiles) · **MVP:** In · **Thursday:** Out

#### Scenario: Open a profile from the list
- **WHEN** a user chooses "The Feral Sea Captain" in the people list
- **THEN** they arrive at `/people/the-feral-sea-captain` and see that person's alias, silhouette, bio, course and tags

#### Scenario: Unknown address
- **WHEN** a user opens `/people/nobody-with-this-name`
- **THEN** they see the standard "page not found" page

#### Scenario: Suspended person
- **WHEN** a user opens the profile address of someone who has been suspended
- **THEN** they see the standard "page not found" page

#### Scenario: Retired tags stay on the profile
- **WHEN** a person picked a tag that has since been retired
- **THEN** their profile still shows that tag

#### Scenario: Visitor who is not signed in
- **WHEN** someone who is not signed in opens a profile address
- **THEN** they are sent to sign in and see nothing of the profile
