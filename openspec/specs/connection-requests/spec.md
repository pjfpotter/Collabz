# connection-requests Specification

## Purpose
Lets two people agree to connect before anything private is shared between them; mutual approval opens a conversation and reveals photos.

## Requirements

### Requirement: Requests only to top 5 or glitch match
A user SHALL be able to send a connection request only to someone in their current top 5 or to their glitch match. The recipient SHALL see the request in-app and SHALL be able to approve or decline it.

**Brief:** Suggested ("connection requests… only opens if both agree") · **MVP:** In · **Thursday:** Out

#### Scenario: Request arrives
- **WHEN** user A sends a request to B, who is in A's top 5
- **THEN** B sees an in-app notification of the request from A's alias

### Requirement: Approval opens a conversation, not an email reveal
When a request is approved, the system SHALL open a private conversation between the two users and SHALL reveal each person's photo (if they uploaded one) to the other. The system SHALL NOT reveal either user's email to the other.

**Brief:** Suggested (connection requests) + Essential ("messaging", "photo") · **MVP:** In · **Thursday:** Out

#### Scenario: Request approved
- **WHEN** B approves A's request
- **THEN** both see a new conversation with each other, each can see the other's photo if one exists, and neither can see the other's email

#### Scenario: Request declined
- **WHEN** B declines A's request
- **THEN** no conversation opens and no photo is revealed
