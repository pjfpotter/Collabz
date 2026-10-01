# Spec Delta

## Purpose

Scores how well every pair of profiles fits, picks each user's top 5 and glitch match, and explains in plain words why any two people might work well together.

## ADDED Requirements

### Requirement: Score uses the chemistry formula only
The score between two profiles SHALL be `(complement × 3) + overlap + tension`, as defined in `collabz-mvp-brief.md`. Complement SHALL count each Seeking tag of one person that is paired with a Quality tag of the other, in both directions, using the stored Seeking↔Quality pairings. Skills, Interests and course SHALL NOT affect the score.

**Brief:** Essential ("a matching algorithm") · **MVP:** In · **Thursday:** Out

#### Scenario: Skills do not change the score
- **WHEN** two pairs of profiles are identical except that one pair shares three Skills
- **THEN** both pairs have the same score

### Requirement: Rescore a user when their answers change
When a user completes onboarding or saves an edit to their answers, the system SHALL recalculate every score involving that user and SHALL leave all other pairs' scores unchanged.

**Brief:** Essential (supports "manage their account") · **MVP:** In · **Thursday:** Out

#### Scenario: Edit changes only that user's edges
- **WHEN** user A changes a Seeking tag
- **THEN** every score between A and others is recalculated, and the score between B and C is untouched

### Requirement: Explain why two people match
For any two users with completed profiles, the system SHALL show a breakdown of their score in plain words: which Seeking↔Quality pairs complement each other (in each direction), whether they share Energy or Vibe, whether their Hero Stories differ, and which Skills or Interests they share (shown for information, not scored).

**Brief:** Essential ("show why two people might be a good fit") · **MVP:** In · **Thursday:** Out

#### Scenario: Breakdown shown on a profile
- **WHEN** user A opens user B's profile
- **THEN** A sees their score with B and a list of the reasons that make it up, each in a short sentence

### Requirement: Notify users of new strong matches
The system SHALL notify a user in-app when someone new enters their top 5.

**Brief:** Suggested ("notifications for new matches") · **MVP:** Later · **Thursday:** Out

#### Scenario: New top-5 match
- **WHEN** a newly completed profile ranks in user A's top 5
- **THEN** A sees a notification naming that person's alias

### Requirement: AI-assisted icebreaker suggestions
The system SHALL offer a connected pair a few suggested opening messages based on their shared reasons for matching.

**Brief:** Stretch ("AI-assisted matching or icebreaker suggestions") · **MVP:** Later · **Thursday:** Out

#### Scenario: Icebreakers in a new conversation
- **WHEN** a conversation has no messages yet
- **THEN** each person sees suggested openers they can pick to send
