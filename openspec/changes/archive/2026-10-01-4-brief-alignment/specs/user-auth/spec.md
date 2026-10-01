# Spec Delta

## Purpose

Lets students create an account and sign in with an emailed magic link, choosing their course and accepting the terms and data policy as they sign up.

## ADDED Requirements

### Requirement: Sign-up records the user's course
The system SHALL let a person create an account with an email magic link. During sign-up they SHALL choose their course from the course list and accept the Terms & Conditions and data policy. No account SHALL be created until all three are done.

**Brief:** Essential ("users sign up, choose which course they're on") · **MVP:** In · **Thursday:** Out

#### Scenario: Successful sign-up
- **WHEN** a new person enters their email, picks "Business", accepts the terms and data policy, and opens the magic link
- **THEN** an account exists with course "Business", and they are taken to onboarding

#### Scenario: Course not chosen
- **WHEN** a person tries to sign up without choosing a course
- **THEN** no account is created and they are asked to choose one

### Requirement: Sign in and sign out
The system SHALL let an existing user sign in with a magic link and sign out from any page.

**Brief:** Essential ("registration and login") · **MVP:** In · **Thursday:** Out

#### Scenario: Sign out
- **WHEN** a signed-in user chooses "Sign out"
- **THEN** their session ends and private pages ask them to sign in again
