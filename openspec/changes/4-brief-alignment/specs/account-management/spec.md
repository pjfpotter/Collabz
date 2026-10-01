# Spec Delta

## Purpose

Lets users manage their own account after onboarding: change their answers, course and photo, and (later) control privacy and take out or delete their data.

## ADDED Requirements

### Requirement: Account page
A signed-in user SHALL have an account page where they can view their own profile, change their course, sign out, and edit any of their onboarding answers using the same pick-from-list choices. Saving an edit SHALL trigger a rescore of that user (see `chemistry-matching`). It SHALL NOT change their alias, their existing connections and conversations, or their glitch match.

**Brief:** Essential ("manage their account") · **MVP:** In · **Thursday:** Out

#### Scenario: Edit a Seeking tag
- **WHEN** a user swaps one Seeking tag for another and saves
- **THEN** their profile and generated bio show the new tag, their scores are recalculated, and their alias and conversations are unchanged

### Requirement: Optional photo, private until connected
A user SHALL be able to upload, replace or remove one photo (common image types, with a size limit). The photo SHALL be visible only to the owner, to users with an approved connection to the owner, and to admins. It SHALL never appear on the graph or in search, and SHALL never be used in scoring.

**Brief:** Essential ("photo") · **MVP:** In · **Thursday:** Out

#### Scenario: Stranger cannot see photo
- **WHEN** a user without an approved connection to A requests A's photo directly
- **THEN** the system refuses

### Requirement: Privacy settings
A user SHALL be able to control who can see their profile or contact them.

**Brief:** Suggested ("privacy settings") · **MVP:** Later · **Thursday:** Out

#### Scenario: Placeholder for later slice
- **WHEN** this requirement is picked up
- **THEN** its own change defines the settings, without breaking the full-graph design (see design.md B11)

### Requirement: Delete account and export data
A user SHALL be able to download their own data and permanently delete their account, including their profile, photo, edges, requests and messages.

**Brief:** Suggested ("account deletion and data export") · **MVP:** Later · **Thursday:** Out

#### Scenario: Delete account
- **WHEN** a user confirms account deletion
- **THEN** they disappear from the graph and search, and their data is removed from the database and file storage
