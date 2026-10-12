# connection-requests Specification

## Purpose
Lets two people agree to connect before anything private is shared between them; mutual approval opens a conversation and reveals photos.

## Requirements

### Requirement: Requests only to top 5 or glitch match
A user SHALL be able to send a connection request only to someone in their current top 5 or to their glitch match, and the system SHALL refuse any other request however it is sent, storing nothing. The system SHALL also refuse a request to oneself, to a suspended person, or between two people where either has blocked the other. The recipient SHALL see the request in-app, with a count of waiting requests on the Requests link, and SHALL be able to approve or decline it.

**Brief:** Suggested ("connection requests… only opens if both agree") · **MVP:** In · **Thursday:** Out

#### Scenario: Request arrives
- **WHEN** user A sends a request to B, who is in A's top 5
- **THEN** B sees an in-app notification of the request from A's alias

#### Scenario: Waiting count
- **WHEN** B has two requests waiting for an answer
- **THEN** the Requests link in the navigation shows 2 on every page, and shows no count when none are waiting

#### Scenario: Not a match
- **WHEN** A sends a request to C, who is not in A's top 5 and is not A's glitch match, even by calling the server directly
- **THEN** the system refuses and stores no request

#### Scenario: Glitch match
- **WHEN** A sends a request to their glitch match
- **THEN** the request is stored and the glitch match sees it

#### Scenario: Refused for who the person is
- **WHEN** A sends a request to themselves, to a suspended person, or to someone who has blocked A or whom A has blocked
- **THEN** the system refuses and stores no request

### Requirement: Approval opens a conversation, not an email reveal
When a request is approved, the system SHALL open a private conversation between the two users and SHALL reveal each person's photo (if they uploaded one) to the other for as long as the connection stands. The system SHALL NOT reveal either user's email to the other. A connection stops counting for the photo reveal once either user blocks the other.

**Brief:** Suggested (connection requests) + Essential ("messaging", "photo") · **MVP:** In · **Thursday:** Out

#### Scenario: Request approved
- **WHEN** B approves A's request
- **THEN** both see a new conversation with each other, each can see the other's photo if one exists, and neither can see the other's email

#### Scenario: Request declined
- **WHEN** B declines A's request
- **THEN** no conversation opens and no photo is revealed

#### Scenario: Connection ends with a block
- **WHEN** A and B are connected and then either blocks the other
- **THEN** the system no longer treats them as connected, so neither photo is revealed

### Requirement: One request per pair, and a decline is final
The system SHALL allow at most one connection request between any two people, in either direction, ever. A declined request SHALL NOT be sent again by either person. A user who already has a request to or from someone SHALL be told so, not given a second one.

**Brief:** Suggested ("connection requests") · **MVP:** In · **Thursday:** Out

#### Scenario: Already asked
- **WHEN** A has a pending request to B and presses Connect again, or sends it twice at the same moment
- **THEN** only one request exists and A is told one is already waiting

#### Scenario: B asks back
- **WHEN** A has a pending request to B and B tries to send A a request
- **THEN** the system refuses and tells B that A's request is waiting on their Requests page

#### Scenario: After a decline
- **WHEN** B has declined A's request
- **THEN** neither A nor B can send the other a new request

### Requirement: Only the person asked can answer
A request SHALL be approved or declined only by the person it was sent to, only while it is pending, and only once. A request that has been answered, or that is no longer allowed because either person has since been suspended or blocked, SHALL NOT be answerable.

**Brief:** Suggested ("only opens if both agree") · **MVP:** In · **Thursday:** Out

#### Scenario: Someone else answers
- **WHEN** user D, or the sender A, tries to approve A's request to B
- **THEN** the system refuses and the request stays pending

#### Scenario: Answered twice
- **WHEN** B approves a request and then tries to decline it, or approves it a second time
- **THEN** the system refuses and the first answer stands, with one conversation

#### Scenario: Sender no longer allowed
- **WHEN** B tries to approve a request from A after A has been suspended or after either has blocked the other
- **THEN** the system refuses and no conversation opens

### Requirement: Requests page
A signed-in user SHALL have a `/requests` page listing the requests waiting for their answer, each with the sender's alias, silhouette and a link to their profile and Approve and Decline actions, and the requests they have sent, each with its status (waiting, connected or declined). The page SHALL NOT show anyone's email.

**Brief:** Suggested ("connection requests") · **MVP:** In · **Thursday:** Out

#### Scenario: Waiting for me
- **WHEN** B opens `/requests` with a pending request from A
- **THEN** B sees A's alias and silhouette with Approve and Decline, and no email

#### Scenario: Sent by me
- **WHEN** A opens `/requests` after asking B
- **THEN** A sees B's alias with the status "Waiting"; once B approves it says "Connected", and once B declines it says "Declined"

#### Scenario: Signed out
- **WHEN** someone who is not signed in opens `/requests`
- **THEN** they are sent to `/signin`
