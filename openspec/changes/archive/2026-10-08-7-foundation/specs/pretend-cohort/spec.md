# Spec Delta

## Purpose

Gives the team a cohort of pretend students and a way to act as any of them, so every track can be built and tested before real sign-up exists. It is a development aid only: it never exists on production, and join-up (#17) removes it.

## ADDED Requirements

### Requirement: A pretend cohort can be loaded into a development database
The system SHALL provide a command that fills a development database with a pretend cohort of 32 users across both courses. 30 SHALL have finished profiles built only from active catalogue tags within each category's pick limits. Of those 30, one SHALL be an admin and one SHALL be suspended. Two users SHALL have no profile yet. The same command SHALL produce the same cohort on every machine.

**Brief:** Supporting (lets five tracks build in parallel) · **MVP:** In until join-up (#17) · **Thursday:** Out

#### Scenario: Cohort loaded into an empty development database
- **WHEN** the command runs against a development database that has the catalogue but no users
- **THEN** there are 32 pretend users, split evenly between "Software" and "Business", of whom 30 have a finished profile with an alias and a silhouette

#### Scenario: Profiles follow the catalogue's rules
- **WHEN** the cohort has been loaded
- **THEN** every finished profile has, in each active category, at least the minimum and at most the maximum number of tags, and none of them is a retired tag

#### Scenario: Admin, suspended and not-yet-onboarded users exist
- **WHEN** the cohort has been loaded
- **THEN** exactly one pretend user is an admin, exactly one is suspended, and exactly two have no profile

#### Scenario: Same cohort for everyone
- **WHEN** two people load the cohort into two empty databases
- **THEN** both databases hold the same users with the same aliases, tags and scores

### Requirement: The pretend cohort includes data for every track
The loaded cohort SHALL include a stored score for every pair of users with finished profiles, one glitch match for each of them, connection requests in each state (pending, approved and declined), a conversation for every approved request with messages in at least three of them, one conversation that has been closed, one block and one open report.

**Brief:** Supporting · **MVP:** In until join-up (#17) · **Thursday:** Out

#### Scenario: Every pair has a score
- **WHEN** the cohort has been loaded
- **THEN** each of the 435 pairs among the 30 finished profiles has exactly one stored score

#### Scenario: Scores add up
- **WHEN** any stored pretend score is read
- **THEN** it equals its complement part times 3, plus its overlap part, plus its tension part

#### Scenario: Glitch match is a different person
- **WHEN** the cohort has been loaded
- **THEN** each user with a finished profile has one glitch match, who is not themselves and not one of their five highest scores

#### Scenario: Requests, conversations, a block and a report exist
- **WHEN** the cohort has been loaded
- **THEN** there are pending, approved and declined connection requests, every approved request has a conversation, at least three conversations contain messages, one conversation is closed, and there is one block and one open report

### Requirement: Loading the pretend cohort is safe to repeat
Running the command again SHALL NOT duplicate or change any existing pretend record. If a category has been added to the catalogue since the last run, the command SHALL give each finished pretend profile picks in that category.

**Brief:** Supporting · **MVP:** In until join-up (#17) · **Thursday:** Out

#### Scenario: Run twice
- **WHEN** the command runs against a database that already holds the cohort
- **THEN** the number of users, profiles, scores, requests, conversations and messages is unchanged

#### Scenario: Changes made while developing survive
- **WHEN** a pending pretend request has been approved by hand and the command runs again
- **THEN** that request is still approved

#### Scenario: A category added later is filled in
- **WHEN** the catalogue gains a new active category after the cohort was loaded, and the command runs again
- **THEN** every finished pretend profile has picks in the new category within its limits

### Requirement: The pretend cohort never reaches production
The command SHALL refuse to run, and SHALL change nothing, unless the pretend cohort has been switched on for that environment. It SHALL always refuse on the production deployment, even if it has been switched on there by mistake.

**Brief:** Supporting (protects real students' data) · **MVP:** In until join-up (#17) · **Thursday:** Out

#### Scenario: Not switched on
- **WHEN** the command runs in an environment where the pretend cohort has not been switched on
- **THEN** it stops with a message explaining why, and no record is created

#### Scenario: Production
- **WHEN** the command runs on the production deployment, with the pretend cohort switched on by mistake
- **THEN** it stops with a message explaining why, and no record is created

### Requirement: Pretend users are recognisable and cannot receive email
Every pretend user SHALL have an email address on a reserved test domain that cannot receive email, and an id that marks them as pretend, so they can be told apart from real students and removed together.

**Brief:** Supporting · **MVP:** In until join-up (#17) · **Thursday:** Out

#### Scenario: Telling pretend users from real ones
- **WHEN** a database holds both pretend users and real sign-ups
- **THEN** the pretend users can be selected by their id or email address alone, with no real user included

### Requirement: Sign in as any pretend user
Where the pretend cohort is switched on, every page SHALL offer a control listing the pretend users, showing each one's alias, course and whether they are an admin, suspended or not yet onboarded. Choosing one SHALL make the app treat the visitor as that user until they choose another or choose to sign out. The control SHALL show who the visitor is currently signed in as.

**Brief:** Supporting · **MVP:** In until slice 1 (#8) replaces it · **Thursday:** Out

#### Scenario: Become a pretend user
- **WHEN** a visitor picks a pretend user from the control
- **THEN** they return to the page they were on, the control shows that user as signed in, and pages that depend on the signed-in user treat them as that user

#### Scenario: Still signed in on the next page
- **WHEN** a visitor has picked a pretend user and then opens another page
- **THEN** they are still signed in as that user

#### Scenario: Sign out
- **WHEN** a visitor signed in as a pretend user chooses "Signed out" in the control
- **THEN** no user is signed in

#### Scenario: Only pretend users are offered
- **WHEN** the database also holds a real user
- **THEN** the real user is not listed in the control and cannot be chosen through it

### Requirement: The switcher does not exist where the pretend cohort is off
Where the pretend cohort is not switched on, and always on the production deployment, the control SHALL NOT be shown, a request to sign in as a user SHALL be refused, and a previously saved choice SHALL be ignored, so nobody is treated as signed in through the switcher.

**Brief:** Supporting (protects real students' data) · **MVP:** In until slice 1 (#8) replaces it · **Thursday:** Out

#### Scenario: Not shown on production
- **WHEN** anyone opens any page on the production URL
- **THEN** the "sign in as…" control is not on the page

#### Scenario: Direct request refused on production
- **WHEN** someone sends the switcher's sign-in request straight to the production URL
- **THEN** the request is refused as not found, and they are not signed in

#### Scenario: Saved choice ignored
- **WHEN** a browser that chose a pretend user on a development site sends that saved choice to a site where the pretend cohort is off
- **THEN** the visitor is treated as not signed in
