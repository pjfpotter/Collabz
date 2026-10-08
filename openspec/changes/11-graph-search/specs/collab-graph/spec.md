# Spec Delta

## Purpose

Shows the whole cohort as one live graph, so every student can see at a glance how strongly people fit each other, where their own best matches sit, and whether chemistry crosses the two courses.

## ADDED Requirements

### Requirement: The whole cohort is shown as a graph
The system SHALL provide a page at `/graph` that shows every user with a finished profile as a node and every stored score between two shown users as an edge. Suspended users and users without a finished profile SHALL NOT be shown, and neither SHALL any edge to them. The page SHALL be available only to a signed-in user with a finished profile.

**Brief:** Supporting (our own brief's "every user can see the full graph"; shows the Essential matching algorithm) · **MVP:** In · **Thursday:** Out

#### Scenario: Full cohort drawn
- **WHEN** a signed-in user with a finished profile opens `/graph` and the cohort has 29 finished, unsuspended profiles
- **THEN** the graph has 29 nodes and an edge for each of the 406 pairs among them

#### Scenario: Suspended user is not drawn
- **WHEN** a user with a finished profile has been suspended
- **THEN** they do not appear on the graph, and no edge to them is drawn

#### Scenario: Unfinished profile is not drawn
- **WHEN** a user has signed up but not finished onboarding
- **THEN** they do not appear on the graph

#### Scenario: Visitor who is not signed in
- **WHEN** someone who is not signed in opens `/graph`
- **THEN** they are sent to sign in and see no graph

#### Scenario: Signed-in user without a finished profile
- **WHEN** a signed-in user who has not finished onboarding opens `/graph`
- **THEN** they are sent to onboarding

### Requirement: Edges show the strength of each fit
Every edge SHALL be drawn. An edge's thickness SHALL increase with its score, and lower-scoring edges SHALL be drawn fainter than higher-scoring ones, so the graph stays readable with every edge present. Pairs with a higher score SHALL be pulled closer together than pairs with a lower one.

**Brief:** Essential (matching) · **MVP:** In · **Thursday:** Out

#### Scenario: Stronger fit, thicker line
- **WHEN** the edge between A and B has a higher score than the edge between A and C
- **THEN** the A–B edge is drawn thicker and less faint than the A–C edge

#### Scenario: Readable with the full pretend cohort
- **WHEN** the graph shows the full pretend cohort with every edge drawn
- **THEN** individual nodes can still be told apart, and the strongest edges stand out from the rest

### Requirement: Glitch matches look different from scored matches
An edge between a user and their glitch match SHALL be drawn with a dashed pattern, so it differs from other edges by its pattern and not by its thickness. Its thickness SHALL still follow its score.

**Brief:** Supporting (the brief's "glitch… visually distinguished") · **MVP:** In · **Thursday:** Out

#### Scenario: Glitch edge is dashed
- **WHEN** B is A's glitch match
- **THEN** the edge between A and B is dashed, and every edge that is not a glitch match is solid

### Requirement: Your own top 5 and glitch match are highlighted
The viewer's own node, the nodes of their top 5 and the node of their glitch match SHALL be visibly marked on the graph, and the edges from the viewer to those people SHALL stand out from all other edges. The same people SHALL also be listed in text on the page by alias, each linking to their profile.

**Brief:** Essential (matching) · **MVP:** In · **Thursday:** Out

#### Scenario: Top 5 highlighted
- **WHEN** a user opens `/graph`
- **THEN** their own node, their five highest-scoring people and their glitch match are marked, and the edges to those six people stand out

#### Scenario: Same people listed in words
- **WHEN** a user opens `/graph`
- **THEN** the page lists the aliases of their top 5 in score order and names their glitch match separately, each as a link to that person's profile

#### Scenario: Fewer than five other people
- **WHEN** only three other finished profiles exist
- **THEN** all three are highlighted and listed, and nothing is shown in place of the missing two

### Requirement: Course is shown on the graph
Each node SHALL be coloured by its user's course, and the page SHALL show a legend naming the course for each colour.

**Brief:** Supporting (two courses is the brief's theme) · **MVP:** In · **Thursday:** Out

#### Scenario: Two courses, two colours
- **WHEN** the cohort has Software and Business students
- **THEN** Software nodes share one colour, Business nodes share another, and the legend names both

### Requirement: A person on the graph can be opened
Choosing a node SHALL show that person's alias, silhouette, course and their score with the viewer, with a link to their profile. People SHALL be identified on the graph only by alias and silhouette. No email address SHALL be sent to the browser as part of the graph.

**Brief:** Essential (profiles) · **MVP:** In · **Thursday:** Out

#### Scenario: Choose a node
- **WHEN** a user taps or clicks another person's node
- **THEN** they see that person's alias, silhouette, course and score with them, and a link that opens that person's profile

#### Scenario: No email on the page
- **WHEN** the graph page is loaded and everything the server sent to the browser is inspected
- **THEN** no user's email address appears anywhere in it

### Requirement: The graph works on a phone
On a phone-width screen the graph SHALL fit the width of the screen, and the user SHALL be able to move around it, zoom, and choose a node by touch.

**Brief:** Stretch ("mobile-friendly"), needed for the QR-code live test · **MVP:** In · **Thursday:** Out

#### Scenario: Phone width
- **WHEN** `/graph` is opened on a screen 375 pixels wide
- **THEN** the graph, the legend and the list of the viewer's matches are all reachable, and the page does not scroll sideways

#### Scenario: Touch
- **WHEN** a user drags, pinches and taps on the graph on a touch screen
- **THEN** the view moves, zooms, and a tapped node shows that person's details
