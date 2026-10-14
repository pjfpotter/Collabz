# Spec Delta

## MODIFIED Requirements

### Requirement: Private conversations between connected users
Two users with an approved connection SHALL be able to exchange text messages in a conversation that only they can read. Users without an approved connection SHALL NOT be able to message each other. Messages are free text of at most 1000 characters; an empty message is refused. A closed conversation stays readable but SHALL NOT accept new messages, and once closed it never reopens. Messages are free text; the no-free-text rule applies only to onboarding and profiles.

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

#### Scenario: Third party cannot send
- **WHEN** user D tries to send a message into the conversation between A and B
- **THEN** the system refuses and no message is stored

#### Scenario: Message too long
- **WHEN** A sends a message of more than 1000 characters
- **THEN** the system refuses, says the message is too long, and no message is stored

#### Scenario: Empty message
- **WHEN** A sends a message that is empty or only spaces
- **THEN** the system refuses and no message is stored

#### Scenario: Closed conversation refuses messages
- **WHEN** A and B's conversation has been closed (for example because one blocked the other) and A tries to send a message
- **THEN** the system refuses and no message is stored, and the earlier messages can still be read

#### Scenario: Closed conversation does not reopen
- **WHEN** a conversation has been closed and the system is asked to open a conversation between the same two users again
- **THEN** the same conversation is returned, still closed
