# Spec Delta

## MODIFIED Requirements

### Requirement: Categories, tags and courses are stored as data
The system SHALL store each profile category (Hero Story, Energy, Vibe Diagnosis, Qualities, Seeking, and later Skills and Interests), its tags (name, description, display order, stable id) and the list of courses as records in the database. It SHALL NOT hard-code them in application code. A tag's id SHALL NOT change once created. Seeding SHALL only add records that are missing and SHALL NOT overwrite a record that already exists, so changes made in the database survive a re-seed.

**Brief:** Supporting (needed for Essential "Admin screens") · **MVP:** In · **Thursday:** In

#### Scenario: Fresh database is seeded
- **WHEN** the seed runs against an empty database
- **THEN** the database contains the 5 categories from `collabz-mvp-brief.md`, each with its 12 tags in the brief's order with their descriptions, and the courses "Software" and "Business"

#### Scenario: Seed is safe to run twice
- **WHEN** the seed runs against a database that has already been seeded
- **THEN** no category, tag or course is duplicated and no existing id changes

#### Scenario: Re-seeding keeps database edits
- **WHEN** a tag's name has been changed in the database and the seed runs again
- **THEN** the tag keeps its changed name

### Requirement: Public read-only catalogue page
The system SHALL provide a page at `/catalogue`, reachable without signing in, that lists every category with its tags and descriptions in display order. The page SHALL read from the database on each request, not from constants in code. Retired categories and retired tags SHALL NOT be listed.

**Brief:** Supporting · **MVP:** In · **Thursday:** In

#### Scenario: Visitor views the catalogue on the deployed site
- **WHEN** anyone opens `/catalogue` on the deployed URL without signing in
- **THEN** they see each seeded category as a heading with its tags listed underneath, in display order, each with its description

#### Scenario: Catalogue reflects the database
- **WHEN** a tag's name is changed directly in the database and the page is reloaded
- **THEN** the page shows the new name

#### Scenario: Retired tags are hidden
- **WHEN** a tag is marked as retired in the database and the page is reloaded
- **THEN** that tag no longer appears, and the other tags in its category keep their order
