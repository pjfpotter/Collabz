# Spec Delta

## MODIFIED Requirements

### Requirement: Block a user
A user SHALL be able to block another user. After a block, neither can send the other requests or messages. Any conversation between them closes and never reopens, and any revealed photo is hidden again. Each of the two SHALL also disappear from the other's graph, people list, matches and requests. A block is not shown to the blocked person, and there is no way to undo it in the MVP.

**Brief:** Suggested ("block… users") · **MVP:** In · **Thursday:** Out

#### Scenario: Block closes conversation
- **WHEN** A blocks B while they have a conversation
- **THEN** neither can send further messages, and neither can see the other's photo

#### Scenario: Blocked people vanish from each other's lists
- **WHEN** A blocks B
- **THEN** B is missing from A's graph, people list and matches, and A is missing from B's

#### Scenario: Cannot request a blocked person
- **WHEN** A has blocked B and either tries to send the other a connection request
- **THEN** the request is refused with the same vague "unavailable" answer as any other unavailable person

#### Scenario: Cannot block yourself
- **WHEN** A tries to block A
- **THEN** nothing is stored

### Requirement: Report a user
A user SHALL be able to report another user, choosing a reason from a fixed list. A report without a reason from the list SHALL be refused. A person cannot report themselves, and reporting the same person again while the first report is open adds nothing.

**Brief:** Suggested ("report users") · **MVP:** In · **Thursday:** Out

#### Scenario: Report submitted
- **WHEN** A reports B with the reason "Inappropriate messages"
- **THEN** the report appears in the admin moderation queue

#### Scenario: Reason must come from the list
- **WHEN** a report is sent with no reason, or a reason that is not on the list
- **THEN** it is refused and nothing is stored

### Requirement: Admin moderation queue
Admins SHALL see a list of reports (open or resolved), showing the reporter, the reported user and the reason. From a report they SHALL be able to suspend the reported user, remove their photo, or mark the report resolved. Everyone else SHALL be unable to see the queue or use its actions.

**Brief:** Suggested ("admin moderation queue") · **MVP:** In (decision B10) · **Thursday:** Out

#### Scenario: Resolve a report
- **WHEN** an admin suspends the reported user from a report and marks it resolved
- **THEN** the report moves to resolved and the user is suspended

#### Scenario: Non-admins cannot see the queue
- **WHEN** a member opens `/admin/reports`, or a signed-out visitor does
- **THEN** the member sees "page not found" and the visitor is sent to sign in, and no action works for either
