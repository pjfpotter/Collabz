# Spec Delta

## MODIFIED Requirements

### Requirement: Categories, tags and courses are stored as data
The system SHALL store each profile category (Hero Story, Energy, Vibe Diagnosis, Qualities, Seeking, Skills and Interests) with its pick limits, its tags (name, description, display order, stable id, and for Energy and Vibe Diagnosis an alias word) and the list of courses as records in the database. It SHALL NOT hard-code them in application code. A tag's id SHALL NOT change once created. Seeding SHALL only add records that are missing and SHALL NOT overwrite a value that already exists, so changes made in the database survive a re-seed. The one exception is an alias word that is still empty, which the seed SHALL fill in.

**Brief:** Supporting (needed for Essential "Admin screens") · **MVP:** In · **Thursday:** In

#### Scenario: Fresh database is seeded
- **WHEN** the seed runs against an empty database
- **THEN** the database contains the 5 categories from `collabz-mvp-brief.md`, each with its 12 tags in the brief's order with their descriptions, plus the Skills and Interests categories with 12 tags each, and the courses "Software" and "Business"

#### Scenario: Seed is safe to run twice
- **WHEN** the seed runs against a database that has already been seeded
- **THEN** no category, tag or course is duplicated and no existing id changes

#### Scenario: Re-seeding keeps database edits
- **WHEN** a tag's name has been changed in the database and the seed runs again
- **THEN** the tag keeps its changed name

#### Scenario: Pick limits are seeded
- **WHEN** the seed has run
- **THEN** Hero Story, Energy and Vibe Diagnosis allow exactly 1 pick, and Qualities, Seeking, Skills and Interests allow 1 to 4 picks

#### Scenario: Alias words are filled in but never overwritten
- **WHEN** the seed runs against a database where Energy and Vibe Diagnosis tags have no alias word, except one that was changed in the database
- **THEN** every empty alias word is filled in from the seed, and the changed one keeps its value
