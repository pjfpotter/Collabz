# landing-page Specification

## Purpose
Gives Collabz a home page that explains the idea by showing it, and points each visitor to the right next step.

## Requirements

### Requirement: The home page explains what Collabz is
The home page SHALL state, in words, that Collabz matches people on the software and business courses by chemistry rather than CVs, and SHALL list the steps of how it works (pick, match, request, talk) as text. It SHALL keep the Collabz wordmark and a link to the tag catalogue.

**Brief:** Core · **MVP:** In · **Thursday:** In

#### Scenario: Someone lands cold
- **WHEN** a visitor opens `/` and reads only the text
- **THEN** they can tell what Collabz is, who it is for, and the four steps, without watching any animation

#### Scenario: The catalogue is still reachable
- **WHEN** anyone opens `/`
- **THEN** a link to `/catalogue` is on the page

### Requirement: An animated demo shows the idea
The home page SHALL show a looping animated demo of the product idea: a few tags are picked, people appear as silhouettes with aliases in a graph, two of them link with a score and a reason, and approving opens a conversation. The demo SHALL use only invented people, tags and scores, and SHALL NOT read the database or show anything about a real person.

**Brief:** Core · **MVP:** In · **Thursday:** In

#### Scenario: The demo plays
- **WHEN** a visitor opens `/` on a device with no reduced-motion setting
- **THEN** the demo moves through its steps and repeats

#### Scenario: Nothing real is shown
- **WHEN** a signed-in student opens `/`
- **THEN** the demo shows the same invented people as it does for a visitor, and no alias, tag, score or email from the database

### Requirement: The demo does not depend on motion
When the device asks for reduced motion, the demo SHALL show a still picture of its final step instead of moving. The page's meaning SHALL NOT be carried by the animation alone: every step is also written as text, and the demo's picture SHALL have a text description for assistive technology.

**Brief:** Supporting · **MVP:** In · **Thursday:** In

#### Scenario: Reduced motion
- **WHEN** a visitor whose device asks for reduced motion opens `/`
- **THEN** nothing on the page animates, and the demo shows its finished state with the link, score and conversation visible

#### Scenario: Screen reader
- **WHEN** a screen reader reaches the demo
- **THEN** it reads one short description of what the demo shows, and does not read the decorative shapes

### Requirement: The main button follows the viewer
The home page SHALL show a Sign up button, with a Sign in link, to someone who is not signed in. It SHALL show a Go to matches button, and no Sign up or Sign in, to someone who is signed in with a finished account.

**Brief:** Supporting · **MVP:** In · **Thursday:** In

#### Scenario: A visitor
- **WHEN** someone who is not signed in opens `/`
- **THEN** they see a Sign up button that opens `/signup` and a Sign in link that opens `/signin`

#### Scenario: A signed-in student
- **WHEN** a signed-in student opens `/`
- **THEN** they see a Go to matches button that opens `/matches`, and no Sign up or Sign in

### Requirement: The page works on a phone and in both themes
The home page SHALL be usable at 375 pixels wide with no sideways scrolling, SHALL meet the app's text-contrast and tap-target rules in both the light and dark themes, and every button and link SHALL be reachable and visibly focused by keyboard.

**Brief:** Supporting · **MVP:** In · **Thursday:** In

#### Scenario: Phone width
- **WHEN** `/` is opened on a screen 375 pixels wide
- **THEN** all content and both buttons can be reached and the page does not scroll sideways

#### Scenario: Dark theme
- **WHEN** the device prefers a dark theme
- **THEN** the page and the demo use the dark colours and all text stays readable
