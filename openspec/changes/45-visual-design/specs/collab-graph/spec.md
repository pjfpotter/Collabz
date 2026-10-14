# Spec Delta

## MODIFIED Requirements

### Requirement: Course is shown on the graph
Each node SHALL show its user's course by colour and by shape together (Software a circle, Business a rounded square), and the page SHALL show a legend naming the course for each colour and shape.

**Brief:** Supporting (two courses is the brief's theme) · **MVP:** In · **Thursday:** Out

#### Scenario: Two courses, two colours
- **WHEN** the cohort has Software and Business students
- **THEN** Software nodes share one colour and shape, Business nodes share another colour and shape, and the legend names both

#### Scenario: Colour-blind viewer
- **WHEN** the graph is viewed in greyscale
- **THEN** Software and Business nodes can still be told apart by their shape
