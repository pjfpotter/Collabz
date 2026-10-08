# Spec Delta

## MODIFIED Requirements

### Requirement: Admin role
Each user SHALL have a role of member or admin. Admin screens SHALL be reachable only by admins. A member who opens an admin screen SHALL be shown the standard "page not found" page, and a visitor who is not signed in SHALL be sent to sign in. The first admins SHALL be set at deploy time, not through the app.

**Brief:** Essential ("admin screens") · **MVP:** In · **Thursday:** Out

#### Scenario: Member blocked from admin
- **WHEN** a member opens an admin page
- **THEN** access is refused: they see the standard "page not found" page and nothing from the admin screen

#### Scenario: Admin allowed
- **WHEN** an admin opens an admin page
- **THEN** they see that page

#### Scenario: Visitor who is not signed in
- **WHEN** someone who is not signed in opens an admin page
- **THEN** they are sent to the sign-in page
