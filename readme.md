# ASE Fribourg History Scripts

This repo contains the code for group 6 of the group project in Advanced Software Engineering lecutre for Autumn, 2026.

## Structure

```
|- data: contains the data we need to
|- ml-models: code for ml stuff
|- webapp: code for frontend and backend stuff
  |
  |- frontend: code for frontend
  |- backend: code for backend
```

## Deployment

The frontend is deployed to:

main branch:
[https://manuscript-ai.coffee-journal.com/app](https://manuscript-ai.coffee-journal.com/app)

dev branch:
[https://manuscript-ai-dev.coffee-journal.com/app](https://manuscript-ai-dev.coffee-journal.com/app)

For testing credentials, create a new account or contact nicolas.mueller2@gmail.com

## Branching strategy

- We work on feature branches that we merge to dev
- Feature branches follow this convention feat/{some-good-name}
- Fix branches follow this convention: fix/{some-good-name}
- Each tuesday evening, we deploy dev to main

![Diagram showing our gitflow](./documents/branching-strategy.svg)

**Commits**
Commit messages follow this structure:

<type>(<optional scope>): <description>

with types:

- build: anything that drives features forward
- docs: everything docs related
- test: everything test related
- chore: small, cleanup tasks
- refactor: refactorin changes.

and scopes when matching:

- ml
- webapp
- ci

## MVP

The mockup of the mvp is as follows.

![Diagram showing the mvp](./documents/mvp-mockups.svg)
