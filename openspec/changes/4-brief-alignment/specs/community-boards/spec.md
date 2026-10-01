# Spec Delta

## Purpose

Records the brief's suggested community features (events, project ideas board) so they are visible and defined, while staying outside the MVP.

## ADDED Requirements

### Requirement: Events and meetups
Users SHALL be able to see posted events (pitch nights, hack days, socials) and mark that they are going.

**Brief:** Suggested ("events or meetups") · **MVP:** Later · **Thursday:** Out

#### Scenario: Join an event
- **WHEN** a user marks "Going" on a pitch night
- **THEN** the event shows them in its attendee count

### Requirement: Project ideas board
Users SHALL be able to post a short project idea, and other users SHALL be able to express interest in it. This board is separate from the parked phase-two "project nodes" on the graph (`2-mvp-overview` P:31). It SHALL NOT add nodes or edges to the graph.

**Brief:** Suggested ("project ideas board") · **MVP:** Later · **Thursday:** Out

#### Scenario: Express interest in an idea
- **WHEN** a developer marks interest in a business student's idea
- **THEN** the idea's poster sees that interest, and the graph is unchanged
