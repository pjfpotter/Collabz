# admin Specification

## Purpose
Gives Patrick and Tom (admins) screens to manage categories, tags, courses and users without editing the database by hand.

## Requirements

### Requirement: Admin role
Each user SHALL have a role of member or admin. Admin screens SHALL be reachable only by admins. A member who opens an admin screen SHALL be shown the standard "page not found" page, and a visitor who is not signed in SHALL be sent to sign in. The first admins SHALL be set at deploy time, not through the app.

**Brief:** Essential ("admin screens") · **MVP:** In · **Thursday:** Out

#### Scenario: Member blocked from admin
- **WHEN** a member opens an admin page
- **THEN** access is refused: they see the standard "page not found" page and nothing from the admin screen

#### Scenario: Admin allowed
- **WHEN** an admin opens an admin page
- **THEN** they see that page

#### Scenario: Visitor who is not signed in
- **WHEN** someone who is not signed in opens an admin page
- **THEN** they are sent to the sign-in page

### Requirement: Manage categories, tags and courses with guard rails
An admin SHALL be able to add, rename, reorder and retire (and un-retire) categories, tags and courses. Retired items SHALL stop being offered in onboarding, on the catalogue and on the sign-up form, but SHALL stay on profiles and accounts that already use them. Items SHALL NOT be hard-deleted. A new item SHALL get a stable id that no later rename changes. When adding a Quality or Seeking tag, the admin SHALL choose which tag(s) in the other category it pairs with for complement scoring. Renaming SHALL NOT change any score.

**Brief:** Essential ("manage categories, skills, interests, courses") · **MVP:** In · **Thursday:** Out

#### Scenario: Retire a tag
- **WHEN** an admin retires the Interest "Games"
- **THEN** new users cannot pick it, and existing users who picked it still show it

#### Scenario: Rename keeps scores
- **WHEN** an admin renames a Quality tag
- **THEN** every stored score is unchanged and the tag keeps its id

#### Scenario: Rename shows straight away
- **WHEN** an admin renames a tag and then reloads `/catalogue`
- **THEN** the page shows the new name in the same position

#### Scenario: Add a Seeking tag with its pairing
- **WHEN** an admin adds a new Seeking tag and picks one Quality tag it pairs with
- **THEN** the tag exists, is offered in onboarding, and the pairing is stored

#### Scenario: Seeking or Quality tag needs a pairing
- **WHEN** an admin adds a Seeking or Quality tag without picking any tag to pair it with
- **THEN** the tag is not added and the admin is asked to pick at least one

#### Scenario: Retired course not offered
- **WHEN** an admin retires a course
- **THEN** the sign-up form no longer offers it, and people already on it stay on it

#### Scenario: Reorder
- **WHEN** an admin moves a tag up within its category
- **THEN** the catalogue and onboarding list it in the new order

#### Scenario: Nothing can be deleted
- **WHEN** an admin looks for a way to delete a category, tag or course
- **THEN** there is none; only retire and un-retire are offered

### Requirement: Manage users
An admin SHALL be able to list users, suspend and unsuspend a user, and remove a user's photo. An admin SHALL NOT be able to suspend themselves. Suspended users SHALL NOT be able to sign in, and SHALL NOT appear on the graph or in search. A suspended user SHALL have no chemistry scores while suspended and have them again when unsuspended.

**Brief:** Essential ("manage… users") · **MVP:** In (view a profile and reset onboarding: Later) · **Thursday:** Out

#### Scenario: Suspend a user
- **WHEN** an admin suspends user A
- **THEN** A cannot sign in and disappears from the graph and search

#### Scenario: Unsuspend a user
- **WHEN** an admin unsuspends user A
- **THEN** A can sign in again and reappears on the graph and in search

#### Scenario: Admin cannot suspend themselves
- **WHEN** an admin tries to suspend their own account
- **THEN** nothing changes and they are told why

#### Scenario: Remove a photo
- **WHEN** an admin removes user A's photo
- **THEN** A has no photo and the rest of their profile is unchanged

#### Scenario: List users
- **WHEN** an admin opens the users screen
- **THEN** they see every user with their email, course, role and whether they are suspended

### Requirement: Admin dashboard stats
Admins SHALL see counts of sign-ups (by course), connections approved, and conversations with a message in the last 7 days.

**Brief:** Suggested ("dashboard stats for admins") · **MVP:** Later · **Thursday:** Out

#### Scenario: View stats
- **WHEN** an admin opens the dashboard
- **THEN** they see the three counts, with sign-ups split by course

### Requirement: Admin actions are checked on the server
Every admin page and every admin action SHALL check on the server that the caller is an admin, so that a member cannot change anything by calling an action directly.

**Brief:** Essential ("admin screens") · **MVP:** In · **Thursday:** Out

#### Scenario: Member calls an action directly
- **WHEN** a signed-in member sends a request that would rename a tag, bypassing the admin pages
- **THEN** the request is refused and the tag is unchanged

#### Scenario: Signed-out visitor calls an action directly
- **WHEN** a visitor who is not signed in sends a request that would suspend a user
- **THEN** the request is refused and the user is not suspended

### Requirement: Rescore everyone after pairings change
An admin SHALL be able to recalculate every eligible person's scores in one step after changing tag pairings. Changing a pairing SHALL NOT change any stored score by itself.

**Brief:** Supporting (needed for Essential "manage tags") · **MVP:** In · **Thursday:** Out

#### Scenario: Pairing change alone leaves scores
- **WHEN** an admin adds a pairing and does nothing else
- **THEN** every stored score is unchanged

#### Scenario: Rescore everyone
- **WHEN** an admin has added a pairing and presses "Rescore everyone"
- **THEN** every eligible person's scores are recalculated using the new pairings
