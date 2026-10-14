# Spec Delta

## MODIFIED Requirements

### Requirement: Account page
A signed-in user SHALL have an account page where they can view their own profile, change their course, sign out, and edit any of their onboarding answers using the same pick-from-list choices. Saving an edit SHALL trigger a rescore of that user (see `chemistry-matching`). It SHALL NOT change their alias or their existing connections, requests and conversations. It SHALL NOT change their glitch match either, unless the edit makes the glitch match one of their top 5, when `chemistry-matching`'s rule that a glitch match is never in the top 5 applies.

**Brief:** Essential ("manage their account") · **MVP:** In · **Thursday:** Out

#### Scenario: Edit a Seeking tag
- **WHEN** a user swaps one Seeking tag for another and saves
- **THEN** their profile and generated bio show the new tag, their scores are recalculated, and their alias and conversations are unchanged

#### Scenario: Change course
- **WHEN** a Software student changes their course to Business on the account page
- **THEN** their course is saved as Business, and nobody's scores change (course isn't scored)

#### Scenario: Only active courses offered
- **WHEN** a user opens the course choice on the account page
- **THEN** only courses that aren't retired are offered, and their current course is shown even if it has since been retired

#### Scenario: Glitch match kept after an edit
- **WHEN** a user edits an answer and their glitch match is still not among their new top 5
- **THEN** their glitch match is the same person as before

#### Scenario: Glitch match moves into the top 5
- **WHEN** a user's edit makes their glitch match one of their top 5
- **THEN** they are given a new glitch match by `chemistry-matching`'s rules, and that former glitch match now appears in their top 5

#### Scenario: No profile yet
- **WHEN** a signed-in user who hasn't finished onboarding opens the account page
- **THEN** they can change their course and sign out, and are pointed to onboarding instead of being offered answers to edit or a photo

#### Scenario: Not signed in
- **WHEN** someone who isn't signed in opens the account page
- **THEN** they are sent to sign in

### Requirement: Optional photo, private until connected
A user with a finished profile SHALL be able to upload, replace or remove one photo: a JPEG, PNG or WebP file of at most 4 MB. The photo SHALL be visible only to the owner, to users with an approved connection to the owner, and to admins. It SHALL never appear on the graph or in search, and SHALL never be used in scoring. Removing or replacing a photo SHALL delete the old file from storage.

**Brief:** Essential ("photo") · **MVP:** In · **Thursday:** Out

#### Scenario: Stranger cannot see photo
- **WHEN** a user without an approved connection to A requests A's photo directly
- **THEN** the system refuses

#### Scenario: Refused even with the direct link
- **WHEN** someone who isn't the owner, connected to them or an admin opens the photo's address directly, signed in or not
- **THEN** they get "not found", exactly as if there were no photo, so they can't even tell that one exists

#### Scenario: Connected user sees the photo
- **WHEN** B has an approved connection with A, no block between them, and opens A's profile page
- **THEN** B sees A's photo there

#### Scenario: Admin sees the photo
- **WHEN** an admin opens A's photo address
- **THEN** the photo is shown

#### Scenario: Blocked after connecting
- **WHEN** A and B were connected and one of them blocks the other
- **THEN** neither can see the other's photo any more

#### Scenario: File too big or wrong type
- **WHEN** a user uploads a 5 MB photo, or a PDF renamed to end in ".jpg"
- **THEN** it is refused with a message saying why, and their existing photo (if any) is kept

#### Scenario: Remove a photo
- **WHEN** a user removes their photo
- **THEN** the file is deleted from storage and nobody, including the owner, can load it any more

#### Scenario: Replace a photo
- **WHEN** a user uploads a new photo while they already have one
- **THEN** the new photo is shown from then on and the old file is deleted from storage

## ADDED Requirements

### Requirement: Edited answers follow the onboarding rules
Editing answers SHALL apply the same rules as onboarding: each category's pick limits from the catalogue, only tags that belong to that category, and no free text. A tag that was retired after the user picked it SHALL stay on their profile until they remove it, but SHALL NOT be offered as a new pick.

**Brief:** Essential (supports "manage their account") · **MVP:** In · **Thursday:** Out

#### Scenario: Pick limit kept
- **WHEN** a user tries to save five Skills, or no Qualities
- **THEN** the edit is refused, nothing is saved, and they are told the limit for that category

#### Scenario: Tag from another category refused
- **WHEN** an edit to Seeking includes a Quality tag (for example from an edited request)
- **THEN** the edit is refused and nothing is saved

#### Scenario: Retired tag kept but not offered
- **WHEN** a user whose Interests include a since-retired tag edits their Interests
- **THEN** the retired tag is shown as picked and can be removed, but once removed it can't be picked again
