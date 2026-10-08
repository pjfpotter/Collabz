# Spec Delta

## Purpose

Gives every page the same navigation bar and fixes which pages the app has, so people can always find their way around and each part of the app has one agreed address.

## ADDED Requirements

### Requirement: The app has one agreed set of pages
The system SHALL serve a page at each of these addresses: `/signup`, `/signin`, `/onboarding`, `/matches`, `/graph`, `/people`, `/people/[alias]`, `/requests`, `/messages`, `/account`, `/admin` and `/admin/reports`, alongside the existing `/` and `/catalogue`. Until a page's feature is built, the page SHALL show its name and say which slice will build it.

**Brief:** Supporting (lets five tracks build in parallel) · **MVP:** In · **Thursday:** Out

#### Scenario: A planned page that isn't built yet
- **WHEN** anyone opens `/matches` before the matching slice is built
- **THEN** they see a page titled "Matches" that says it is a placeholder and names the slice and issue that will build it

#### Scenario: A page with a person in its address
- **WHEN** anyone opens `/people/` followed by any alias before the people slice is built
- **THEN** they see the placeholder page for a person's profile, not an error

#### Scenario: Existing pages are unchanged
- **WHEN** anyone opens `/catalogue`
- **THEN** they see the tag catalogue exactly as before, now with the navigation bar above it

### Requirement: Shared navigation bar on every page
Every page SHALL show the same navigation bar, with a link to the home page and to each page in the agreed set that can be opened without choosing a person. The bar SHALL be usable on a phone-width screen.

**Brief:** Supporting · **MVP:** In · **Thursday:** Out

#### Scenario: Reach any page from any page
- **WHEN** a visitor on any page uses a link in the navigation bar
- **THEN** they arrive at that page, and the navigation bar is still shown

#### Scenario: Phone width
- **WHEN** the navigation bar is viewed on a screen 375 pixels wide
- **THEN** every link can be reached and tapped, and the page does not scroll sideways
