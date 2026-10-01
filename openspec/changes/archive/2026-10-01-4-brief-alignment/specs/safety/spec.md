# Spec Delta

## Purpose

Lets users protect themselves from unwanted contact, and gives admins one place to review and act on reports.

## ADDED Requirements

### Requirement: Block a user
A user SHALL be able to block another user. After a block, neither can send the other requests or messages. Any conversation between them closes, and any revealed photo is hidden again.

**Brief:** Suggested ("block… users") · **MVP:** In · **Thursday:** Out

#### Scenario: Block closes conversation
- **WHEN** A blocks B while they have a conversation
- **THEN** neither can send further messages, and neither can see the other's photo

### Requirement: Report a user
A user SHALL be able to report another user, choosing a reason from a fixed list.

**Brief:** Suggested ("report users") · **MVP:** In · **Thursday:** Out

#### Scenario: Report submitted
- **WHEN** A reports B with the reason "Inappropriate messages"
- **THEN** the report appears in the admin moderation queue

### Requirement: Admin moderation queue
Admins SHALL see a list of reports (open or resolved), showing the reporter, the reported user and the reason. From a report they SHALL be able to suspend the reported user, remove their photo, or mark the report resolved.

**Brief:** Suggested ("admin moderation queue") · **MVP:** In (decision B10) · **Thursday:** Out

#### Scenario: Resolve a report
- **WHEN** an admin suspends the reported user from a report and marks it resolved
- **THEN** the report moves to resolved and the user is suspended
