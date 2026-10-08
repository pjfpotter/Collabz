# Spec Delta

## MODIFIED Requirements

### Requirement: Sign-up records the user's course
The system SHALL let a person create an account with an email magic link. During sign-up they SHALL choose their course from the course list and accept the Terms & Conditions and data policy, all on one form, before the link is sent. Opening the link SHALL finish sign-up in whichever browser it opens in. No account SHALL count as created until all three are done.

**Brief:** Essential ("users sign up, choose which course they're on") · **MVP:** In · **Thursday:** Out

#### Scenario: Successful sign-up
- **WHEN** a new person enters their email, picks "Business", accepts the terms and data policy, and opens the magic link
- **THEN** an account exists with course "Business", and they are taken to onboarding

#### Scenario: Course not chosen
- **WHEN** a person tries to sign up without choosing a course
- **THEN** no account is created and they are asked to choose one

#### Scenario: Terms not accepted
- **WHEN** a person fills in their email and course but doesn't accept the terms and data policy
- **THEN** no magic link is sent, no account is created, and they are asked to accept them

#### Scenario: Link opened in a different browser
- **WHEN** a person signs up on their phone's browser and opens the magic link in their email app's own browser
- **THEN** sign-up still finishes with the course they picked, and they are taken to onboarding

#### Scenario: Retired course not offered
- **WHEN** a person opens the sign-up form
- **THEN** only courses that aren't retired are offered

### Requirement: Sign in and sign out
The system SHALL let an existing user sign in with a magic link and sign out from any page. Every page SHALL show whether the visitor is signed in.

**Brief:** Essential ("registration and login") · **MVP:** In · **Thursday:** Out

#### Scenario: Sign in
- **WHEN** a person with a finished account enters their email on the sign-in page and opens the magic link
- **THEN** they are signed in and taken to the home page

#### Scenario: Sign out
- **WHEN** a signed-in user chooses "Sign out"
- **THEN** their session ends and private pages ask them to sign in again

#### Scenario: Signing in with an email that has no account
- **WHEN** someone uses the sign-in page with an email that has no account and opens the magic link
- **THEN** they are asked to choose a course and accept the terms and data policy before anything else, as in sign-up

## ADDED Requirements

### Requirement: An unfinished account can't use the app
A person who has opened a magic link but has no course or no accepted terms SHALL be treated as signed out everywhere except the step that asks for them. The system SHALL send them to that step when they try to sign in again.

**Brief:** Essential (supports "users sign up, choose which course they're on") · **MVP:** In · **Thursday:** Out

#### Scenario: Unfinished account opens another page
- **WHEN** a person whose account has no course opens the graph
- **THEN** the page treats them as not signed in

#### Scenario: Unfinished account signs in again
- **WHEN** a person whose account has no accepted terms signs in with a magic link
- **THEN** they are asked to choose a course and accept the terms before going anywhere else

### Requirement: Suspended users can't sign in
A suspended user SHALL NOT be able to sign in. A suspended user who is already signed in SHALL be treated as signed out from their next page.

**Brief:** Essential (supports "admin screens: manage users") · **MVP:** In · **Thursday:** Out

#### Scenario: Suspended user tries to sign in
- **WHEN** a suspended user opens a magic link
- **THEN** they are not signed in and see a message that their account is suspended

#### Scenario: Suspended while signed in
- **WHEN** a signed-in user is suspended and then opens another page
- **THEN** that page treats them as not signed in

### Requirement: Terms & Conditions and data policy pages
The system SHALL publish a Terms & Conditions page and a data policy page that anyone can read without signing in. The sign-up form SHALL link to both. The data policy SHALL say what personal data is held (including photos and messages), who can see it, and when and by whom it is deleted.

**Brief:** Essential ("Terms & Conditions and a data policy") · **MVP:** In · **Thursday:** Out

#### Scenario: Read the policy before signing up
- **WHEN** a person who isn't signed in opens the data policy from the sign-up form
- **THEN** they can read it in full without signing in

#### Scenario: Policy covers photos and messages
- **WHEN** someone reads the data policy
- **THEN** it says how photos and messages are stored, who can see them, and when they are deleted

### Requirement: First admins come from the deployment's settings
An email listed in the deployment's admin list SHALL be given the admin role when its account is created. Every other account SHALL be created as a member. The list SHALL live in the deployment settings, never in the code.

**Brief:** Essential (supports "admin screens") · **MVP:** In · **Thursday:** Out

#### Scenario: Listed email becomes admin
- **WHEN** a person whose email is on the admin list signs up
- **THEN** their account has the admin role

#### Scenario: Unlisted email becomes member
- **WHEN** a person whose email is not on the admin list signs up
- **THEN** their account has the member role

#### Scenario: Email letter case doesn't matter
- **WHEN** the admin list contains "Tom@Example.com" and a person signs up as "tom@example.com"
- **THEN** their account has the admin role

### Requirement: Magic links are single-use and expire
A magic link SHALL sign someone in at most once, and SHALL stop working after it expires. The system SHALL NOT show a person's sign-up email to other users.

**Brief:** Supporting (a real sign-up with real students' data) · **MVP:** In · **Thursday:** Out

#### Scenario: Link used twice
- **WHEN** someone opens a magic link that has already been used
- **THEN** they are not signed in and are offered a new link

#### Scenario: Link expired
- **WHEN** someone opens a magic link more than 24 hours after it was sent
- **THEN** they are not signed in and are offered a new link
