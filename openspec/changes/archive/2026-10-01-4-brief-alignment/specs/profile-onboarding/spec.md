# Spec Delta

## Purpose

Builds each person's profile entirely from pick-from-list choices, so every profile is comparable for matching and nobody faces an empty text box.

## ADDED Requirements

### Requirement: Profiles are built only from picks
Onboarding SHALL consist of seven pick-from-list exercises: Hero Story (pick 1), Energy (pick 1), Vibe Diagnosis (pick 1), Qualities (up to 4), Seeking (up to 4), Skills (up to 4) and Interests (up to 4). The user also picks a silhouette avatar. Onboarding and the public profile SHALL contain no free-text input. Only active (not retired) tags SHALL be offered.

**Brief:** Essential ("skills, interests, and what they're looking for") · **MVP:** In · **Thursday:** Out

#### Scenario: Skills and interests captured
- **WHEN** a user picks "Back-end" and "Data" as Skills and "Climate" as an Interest
- **THEN** their completed profile lists those skills and that interest

#### Scenario: No typing anywhere
- **WHEN** a user goes through all of onboarding
- **THEN** every step is a selection from a list, and there is no text box

### Requirement: Generated bio
Each completed profile SHALL show a short, readable bio generated from the person's own tags (Hero Story, Energy, Qualities, Seeking, and where present Skills and Interests). The user does not type it. It updates whenever their tags change.

**Brief:** Essential ("bio") · **MVP:** In · **Thursday:** Out

#### Scenario: Bio reflects the profile
- **WHEN** a user with Hero Story "The Corporate Escapee" and Quality "Actually finishes the thing" completes onboarding
- **THEN** their profile shows a bio that mentions both, in plain sentences

### Requirement: Alias and silhouette are the public identity
On the graph, in search and in profiles seen by people they are not connected to, a user SHALL be shown only by their generated alias and picked silhouette. Their email SHALL never be shown to other users.

**Brief:** Essential (profiles) · **MVP:** In · **Thursday:** Out

#### Scenario: Stranger views a profile
- **WHEN** a user opens the profile of someone they are not connected to
- **THEN** they see the alias, silhouette, generated bio, course, skills and interests, and no email or photo
