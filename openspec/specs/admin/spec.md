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
An admin SHALL be able to add, rename, reorder and retire categories, tags and courses. Retired items SHALL stop being offered in onboarding, but SHALL stay on profiles that already use them. Items SHALL NOT be hard-deleted. When adding a Quality or Seeking tag, the admin SHALL choose which tag(s) in the other category it pairs with for complement scoring. Renaming SHALL NOT change any score.

**Brief:** Essential ("manage categories, skills, interests, courses") · **MVP:** In · **Thursday:** Out

#### Scenario: Retire a tag
- **WHEN** an admin retires the Interest "Games"
- **THEN** new users cannot pick it, and existing users who picked it still show it

#### Scenario: Rename keeps scores
- **WHEN** an admin renames a Quality tag
- **THEN** every stored score is unchanged

### Requirement: Manage users
An admin SHALL be able to list users, view a profile, suspend and unsuspend a user, reset a user's onboarding, and remove a user's photo. Suspended users SHALL NOT be able to sign in, and SHALL NOT appear on the graph or in search.

**Brief:** Essential ("manage… users") · **MVP:** In · **Thursday:** Out

#### Scenario: Suspend a user
- **WHEN** an admin suspends user A
- **THEN** A cannot sign in and disappears from the graph and search

### Requirement: Admin dashboard stats
Admins SHALL see counts of sign-ups (by course), connections approved, and conversations with a message in the last 7 days.

**Brief:** Suggested ("dashboard stats for admins") · **MVP:** Later · **Thursday:** Out

#### Scenario: View stats
- **WHEN** an admin opens the dashboard
- **THEN** they see the three counts, with sign-ups split by course
