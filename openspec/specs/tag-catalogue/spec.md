# tag-catalogue Specification

## Purpose
Holds the profile categories, their tags and the course list as data, so onboarding, search and admin all read one shared list instead of constants in code.

## Requirements

### Requirement: Categories, tags and courses are stored as data
The system SHALL store each profile category (Hero Story, Energy, Vibe Diagnosis, Qualities, Seeking, and later Skills and Interests), its tags (name, description, display order, stable id) and the list of courses as records in the database. It SHALL NOT hard-code them in application code. A tag's id SHALL NOT change once created.

**Brief:** Supporting (needed for Essential "Admin screens") · **MVP:** In · **Thursday:** In

#### Scenario: Fresh database is seeded
- **WHEN** the seed runs against an empty database
- **THEN** the database contains the 5 categories from `collabz-mvp-brief.md`, each with its 12 tags in the brief's order with their descriptions, and the courses "Software" and "Business"

#### Scenario: Seed is safe to run twice
- **WHEN** the seed runs against a database that has already been seeded
- **THEN** no category, tag or course is duplicated and no existing id changes

### Requirement: Public read-only catalogue page
The system SHALL provide a page, reachable without signing in, that lists every category with its tags and descriptions in display order. The page SHALL read from the database, not from constants in code.

**Brief:** Supporting · **MVP:** In · **Thursday:** In

#### Scenario: Visitor views the catalogue on the deployed site
- **WHEN** anyone opens the catalogue page on the deployed URL
- **THEN** they see each seeded category as a heading with its tags listed underneath, in display order, each with its description

#### Scenario: Catalogue reflects the database
- **WHEN** a tag's name is changed directly in the database and the page is reloaded
- **THEN** the page shows the new name
