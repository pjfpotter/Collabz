# Spec Delta

## Purpose

Lets users explore the whole cohort by course, skill and interest, beyond their own top matches, while keeping the top 5 contact limit.

## ADDED Requirements

### Requirement: Filter people by course, skill and interest
A signed-in user SHALL be able to filter all completed profiles by course, skill and interest. The results are listed and highlighted on the graph. Any result's profile can be opened.

**Brief:** Essential ("find people by filters") · **MVP:** In · **Thursday:** Out

#### Scenario: Filter by skill
- **WHEN** a user filters by Skill "UX/design"
- **THEN** only profiles with that skill are listed and highlighted on the graph

### Requirement: Search does not widen who can be contacted
Opening a profile found through search SHALL show the "why you match" breakdown. A connection request SHALL only be possible if that person is in the viewer's top 5 or is their glitch match.

**Brief:** Essential (search) · **MVP:** In · **Thursday:** Out

#### Scenario: Found person outside top 5
- **WHEN** a user opens the profile of someone found by filter who is not in their top 5 and is not their glitch match
- **THEN** they see the profile and the breakdown, and no "Send request" action

### Requirement: Favourites shortlist
A user SHALL be able to save profiles to a private shortlist and come back to them later.

**Brief:** Suggested ("favourites or shortlist") · **MVP:** Later · **Thursday:** Out

#### Scenario: Save a profile
- **WHEN** a user saves a profile to their shortlist
- **THEN** it appears on their shortlist page, and nobody else can see that they saved it
