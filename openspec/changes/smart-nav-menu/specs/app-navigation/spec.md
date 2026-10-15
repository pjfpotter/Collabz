# Spec Delta

## ADDED Requirements

### Requirement: Admin links are for admins only
The navigation bar SHALL show the Admin and Reports links only to a signed-in person whose role is admin. Hiding the links SHALL NOT replace the existing page guards: the admin pages stay unavailable to everyone else by address as well.

**Brief:** Supporting · **MVP:** In · **Thursday:** Out

#### Scenario: A student does not see admin links
- **WHEN** a signed-in student who is not an admin views any page
- **THEN** the navigation bar has no Admin link and no Reports link

#### Scenario: An admin sees admin links
- **WHEN** a signed-in admin views any page
- **THEN** the navigation bar shows both the Admin and the Reports link, and each opens its page

#### Scenario: A signed-out visitor does not see admin links
- **WHEN** someone who is not signed in views any page
- **THEN** the navigation bar has no Admin link and no Reports link

#### Scenario: The address still refuses a student
- **WHEN** a signed-in student opens `/admin` or `/admin/reports` by typing the address
- **THEN** they see "page not found", exactly as before

### Requirement: Sign up and sign in links disappear once signed in
The navigation bar SHALL show the Sign up and Sign in links only when nobody is signed in. A signed-in person SHALL still see the signed-in status and Sign out button.

**Brief:** Supporting · **MVP:** In · **Thursday:** Out

#### Scenario: A visitor sees both links
- **WHEN** someone who is not signed in views any page
- **THEN** the navigation bar shows the Sign up and Sign in links

#### Scenario: A signed-in person does not
- **WHEN** a signed-in person with a finished account views any page
- **THEN** the navigation bar has no Sign up link and no Sign in link, and still shows who they are signed in as and a Sign out button

#### Scenario: Someone who has not finished signing up keeps the links
- **WHEN** a person has opened their emailed link but has not yet chosen a course and accepted the terms
- **THEN** they are treated as signed out for the navigation bar, so Sign up is still available to finish

## MODIFIED Requirements

### Requirement: Shared navigation bar on every page
Every page SHALL show the same navigation bar, with a link to the home page and to each page in the agreed set that can be opened without choosing a person, except that the admin links and the sign-up and sign-in links are shown only as the two requirements above say. The bar SHALL be usable on a phone-width screen.

**Brief:** Supporting · **MVP:** In · **Thursday:** Out

#### Scenario: Reach any page from any page
- **WHEN** a visitor on any page uses a link in the navigation bar
- **THEN** they arrive at that page, and the navigation bar is still shown

#### Scenario: Phone width
- **WHEN** the navigation bar is viewed on a screen 375 pixels wide
- **THEN** every link can be reached and tapped, and the page does not scroll sideways
