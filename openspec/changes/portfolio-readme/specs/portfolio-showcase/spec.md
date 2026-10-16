# Spec Delta

## Purpose

Lets an outside visitor, with no account, read the interactive course and explore the architecture diagram on the live site, so Collabz can be shown as a portfolio piece.

## ADDED Requirements

### Requirement: The interactive course is public
The app SHALL serve the interactive course at `/course/index.html`, and `/course` SHALL redirect there. It SHALL open for someone who is not signed in, SHALL NOT read the database, and SHALL load its own styles and script from the same site.

**Brief:** Out · **MVP:** Out · **Thursday:** Out (portfolio extra)

#### Scenario: A signed-out visitor opens the course
- **WHEN** someone who is not signed in opens `/course/index.html`
- **THEN** the course's first screen is shown, with its styling applied and its script running, and nobody is asked to sign in

#### Scenario: The short address works
- **WHEN** someone opens `/course`
- **THEN** they are sent to `/course/index.html`

#### Scenario: The course works with no database
- **WHEN** the database cannot be reached and someone opens `/course/index.html`
- **THEN** the course still opens, because it reads nothing from the database

### Requirement: The architecture diagram is public and has both themes
The app SHALL serve the architecture diagram as a standalone page at `/architecture.html` that opens without sign-in and offers a light and a dark theme. The README SHALL show the diagram as a picture in each theme and link to the interactive page.

**Brief:** Out · **MVP:** Out · **Thursday:** Out (portfolio extra)

#### Scenario: A visitor opens the diagram
- **WHEN** someone who is not signed in opens `/architecture.html`
- **THEN** the diagram is shown and can be switched between light and dark

#### Scenario: The README shows the right picture for the reader's theme
- **WHEN** someone views the README on GitHub with a dark colour scheme
- **THEN** they see the dark diagram, and with a light colour scheme they see the light one

### Requirement: The presentation slides are public and phone-friendly
The app SHALL serve the presentation slides as one HTML page at `/slides/collabz.html` that opens without sign-in, works on a phone, and is light enough to load quickly (under 5 MB). The slides SHALL stay HTML, not a PDF.

**Brief:** Out · **MVP:** Out · **Thursday:** Out (portfolio extra)

#### Scenario: A visitor opens the slides on a phone
- **WHEN** someone who is not signed in opens `/slides/collabz.html` on a phone
- **THEN** the first slide is shown, and swiping or tapping moves through all of the slides, with a "n / total" counter

#### Scenario: The file is light
- **WHEN** the size of `/slides/collabz.html` is checked
- **THEN** it is under 5 MB

### Requirement: Showcase pages contain nothing private
The course, the diagram, the slides and the QR code SHALL contain no secrets, no environment values, no database addresses, no personal email addresses (in text or inside a picture), no photograph of an identifiable person (other than public GitHub profile pictures) and no machine-specific file paths.

**Brief:** Out · **MVP:** Out · **Thursday:** Out (portfolio extra)

#### Scenario: A scan of the published files finds no private values
- **WHEN** `public/course/`, `public/architecture.html`, `public/slides/collabz.html` and the new README section are searched for database addresses, app passwords, `AUTH_SECRET` values, `/home/` paths and email addresses
- **THEN** nothing private is found (the Collabz test addresses ending `@collabz.test`, invented example addresses and the repository address are not private)

#### Scenario: The slides show no personal email or face
- **WHEN** every picture inside `public/slides/collabz.html` is looked at
- **THEN** none shows a personal email address, and none is a photograph of a person, apart from the tiny public GitHub profile pictures in the screenshot of the issues list

### Requirement: The live-site QR code does not replace the other codes
The new QR code SHALL point at the live site's home page and SHALL be saved as `public/qr-live-site.png`. The sign-up QR code (`public/qr-code.png`) and the graph-demo QR code (`public/qr-graph-demo.png`) SHALL stay exactly as they are.

**Brief:** Out · **MVP:** Out · **Thursday:** Out (portfolio extra)

#### Scenario: Scanning the new code
- **WHEN** a phone scans `public/qr-live-site.png`
- **THEN** it opens `https://collabz-ten.vercel.app`

#### Scenario: The other codes are untouched
- **WHEN** the change is finished
- **THEN** `public/qr-code.png` and `public/qr-graph-demo.png` are byte for byte what they were before
