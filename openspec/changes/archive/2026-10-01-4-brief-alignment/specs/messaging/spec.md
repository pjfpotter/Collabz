# Spec Delta

## Purpose

Gives connected users a private place to talk inside the app, so they never need to swap personal contact details to start collaborating.

## ADDED Requirements

### Requirement: Private conversations between connected users
Two users with an approved connection SHALL be able to exchange text messages in a conversation that only they can read. Users without an approved connection SHALL NOT be able to message each other. Messages are free text; the no-free-text rule applies only to onboarding and profiles.

**Brief:** Essential ("messaging: private conversations between users") · **MVP:** In · **Thursday:** Out

#### Scenario: Send and read a message
- **WHEN** A sends "Fancy a coffee before the pitch night?" in their conversation with B
- **THEN** B sees the message, with A's alias and the time, the next time they open or refresh the conversation

#### Scenario: No conversation without approval
- **WHEN** A tries to message C with no approved connection
- **THEN** the system refuses and no message is stored

#### Scenario: Third party cannot read
- **WHEN** user D requests the conversation between A and B
- **THEN** the system refuses access

### Requirement: Notify users of new messages
The system SHALL show a user an in-app indicator of unread messages.

**Brief:** Suggested ("notifications for messages") · **MVP:** Later · **Thursday:** Out

#### Scenario: Unread indicator
- **WHEN** B has an unread message from A
- **THEN** B sees an unread marker on their conversations link

### Requirement: Real-time chat
New messages SHALL appear in an open conversation without a page refresh.

**Brief:** Stretch ("real-time chat") · **MVP:** Later · **Thursday:** Out

#### Scenario: Live message
- **WHEN** A sends a message while B has the conversation open
- **THEN** it appears on B's screen within a few seconds without B refreshing
