# Manuscript AI

## Summary

The goal of this project is to transcribe scanned historical documents and provide useful information to the reader. The project can be run locally or live at: [https://manuscript-ai.coffee-journal.com/app](https://manuscript-ai.coffee-journal.com) (ML Transcription is very slow in online version)

## Installation and Startup

**Prerequisites**

To run the project, you need:

* git
* docker desktop
* nodejs + npm (For the frontend)
* python 3.12
* GNU Make

**Startup**

To run the project locally, you need to run those commands. Note that make install can take some time because the ML Backend needs to download CPU torch, Kraken and the ML Model.

```
make prepare:local
make install
make start
```

## Architecture

The backend code is written in python, frontend with typescript (react). We have a microservice architecture with backend, ml-backend and frontend.

## Structure

The code is organized as follows:

```
|- data: contains the data we need to train our models, plus test pages to upload in the webapp
|- ml-models: code for ml stuff
|- documents: project's documentation
|- webapp: code for frontend and backend stuff
  |
  |- frontend: code for frontend
  |- backend: code for backend
  |- ml-backend: code for the deployed ml backend
```


## Further reading

- [Deployment](./documents/deployment.md): environments (production and dev), Coolify setup and how to release
- [Workflow](./documents/workflow.md): branching strategy, commit conventions and the MVP
- [Presentation (28.10.2026)](./documents/presentation%2028.10.26/Manuscript%20AI%20-%20slides.pdf): slides of the MVP presentation
