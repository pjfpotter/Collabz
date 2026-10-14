# Spec Delta

## Purpose
Fixes the look of the whole app as rules that can be checked by eye: themes, colour contrast, how a course is shown, how long names behave, phone-first layout, motion and brand details. It adds no feature behaviour.

## ADDED Requirements

### Requirement: Light and dark themes follow the device
Every page SHALL be shown in a light theme or a dark theme according to the device's colour-scheme setting, using the same named colours in both. Text SHALL meet a contrast ratio of at least 4.5:1 against its background, and the borders of form controls SHALL meet at least 3:1.

**Brief:** Supporting (the first impression is a phone in a room) · **MVP:** In · **Thursday:** Out

#### Scenario: Device is set to dark
- **WHEN** a visitor whose device prefers a dark appearance opens any page
- **THEN** the page uses the dark theme, with no flash of the light theme

#### Scenario: Device is set to light
- **WHEN** a visitor whose device prefers a light appearance opens any page
- **THEN** the page uses the light theme

### Requirement: Course is never shown by colour alone
Wherever a course is shown (badges, person rows and cards, profile, requests, messages, the graph and its legend), it SHALL be shown by its colour, its shape and its name together. Software SHALL be a circle and Business SHALL be a rounded square.

**Brief:** Supporting (two courses is the brief's theme; colour-blind viewers) · **MVP:** In · **Thursday:** Out

#### Scenario: Colour removed
- **WHEN** a screen showing people from both courses is viewed in greyscale
- **THEN** each person's course can still be told from the shape and the word beside it

### Requirement: Long aliases wrap instead of breaking the layout
An alias, however long, SHALL wrap onto more lines within its container and SHALL NOT be cut off, overflow its container or make the page scroll sideways.

**Brief:** Supporting · **MVP:** In · **Thursday:** Out

#### Scenario: A very long alias on a phone
- **WHEN** a person whose alias is 60 characters long is shown in a list row on a screen 375 pixels wide
- **THEN** the whole alias is readable on several lines and the page does not scroll sideways

### Requirement: Every screen works at phone width first
Every page SHALL be usable on a screen 375 pixels wide without sideways scrolling, with every tap target at least 44 pixels high and wide. On wider screens the same pages SHALL use the extra room instead of showing a different product.

**Brief:** Stretch ("mobile-friendly"), needed for the QR-code live test · **MVP:** In · **Thursday:** Out

#### Scenario: Phone width
- **WHEN** any restyled page is opened on a screen 375 pixels wide
- **THEN** all its content and controls can be reached, and nothing makes the page scroll sideways

### Requirement: Motion is light and can be switched off
Selecting a chip, opening a panel and the graph settling SHALL use short, light motion only. When the device asks for reduced motion, no page SHALL animate, and the graph SHALL be drawn already settled.

**Brief:** Supporting · **MVP:** In · **Thursday:** Out

#### Scenario: Reduced motion
- **WHEN** a visitor whose device asks for reduced motion opens `/graph`
- **THEN** the graph appears settled, without drifting or flickering, and selecting things does not animate

### Requirement: The app has a brand identity in the browser
Every page SHALL carry the Collabz tab icon, home-screen icon, web app manifest, a theme colour for each colour scheme and a share image, and page titles SHALL read "Page · Collabz".

**Brief:** Supporting · **MVP:** In · **Thursday:** Out

#### Scenario: Link preview and tab
- **WHEN** a page address is shared in a chat app, or the page is open in a browser tab
- **THEN** the chat app shows the Collabz share image, and the tab shows the Collabz icon and a title ending "· Collabz"

#### Scenario: Added to a home screen
- **WHEN** a person adds the app to their phone's home screen
- **THEN** it appears with the Collabz icon and the name "Collabz"
