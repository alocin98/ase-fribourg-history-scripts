# Fribourg History Scripts Backend

The backend is the API for uploading, storing, and browsing scanned historical
documents. It provides user accounts, session-based authentication, document
metadata, and access to extracted document pages.

## Tech stack

- **Python 3.12** and **FastAPI** for the HTTP API
- **Uvicorn** for the ASGI server
- **SQLAlchemy 2** with its async API and **asyncpg** for PostgreSQL access
- **Alembic** for database migrations
- **Pydantic Settings** for environment-based configuration
- **pwdlib** with Argon2/Bcrypt support for password hashing
- **PostgreSQL 16** for users, sessions, documents, and page metadata
- **Docker Compose** for local development, with Adminer and SeaweedFS
- **SeaweedFS S3-compatible storage** for uploaded ZIP archives and page images

## Architecture

Requests enter through `app/main.py`, where the FastAPI application configures
CORS and CSRF middleware and mounts the API router under `API_STR` (normally
`/api`). Route handlers validate requests and delegate business logic to service
classes and persistence to repositories. SQLAlchemy models describe the
database tables, while Pydantic schemas define request and response shapes.

Document metadata and page records are stored in PostgreSQL. Uploaded ZIP files
and extracted page images are stored in the SeaweedFS S3-compatible bucket
configured by `BUCKET_*` settings. The API downloads objects through the storage
abstraction instead of reading a local `storage/` directory.

## Project structure

```text
backend/
├── app/
│   ├── main.py                 # FastAPI application, middleware, router setup
│   ├── api/
│   │   ├── dependencies/       # Database, authentication, and service dependencies
│   │   ├── router.py           # API router aggregation
│   │   ├── routes/
│   │   │   ├── documents.py    # Documents, uploads, pages, and downloads
│   │   │   ├── iiif.py         # IIIF image metadata and transformations
│   │   │   ├── login.py        # Login, logout, and CSRF token endpoints
│   │   │   ├── transcriptions.py # Transcription job endpoints
│   │   │   ├── user.py         # Registration and current-user endpoints
│   │   │   └── utils.py        # Health check endpoint
│   │   └── schemas/            # Pydantic request and response models
│   ├── core/
│   │   ├── config.py           # Environment-backed application settings
│   │   ├── middleware.py       # CSRF protection
│   │   └── security.py         # Password and CSRF helpers
│   ├── infrastructure/
│   │   ├── database/            # Async SQLAlchemy engine and sessions
│   │   └── storage/             # S3-compatible object storage client
│   ├── models/                 # SQLAlchemy database models
│   ├── repositories/            # Database access and persistence operations
│   ├── services/                # Application and domain services
│   └── workers/                 # Background transcription workers
├── alembic/
│   ├── env.py                  # Migration environment
│   └── versions/               # Versioned database migrations
├── Docker-compose.yml          # API, PostgreSQL, SeaweedFS, and Adminer services
├── Dockerfile                  # Production-oriented API image
├── requirements.txt            # Python dependencies
├── requirements-dev.txt        # Test and code-quality dependencies
├── Makefile                    # Docker, formatting, lint, and test commands
└── exemple.env                 # Environment variable template
```

## Requirements

For the recommended workflow, install:

- Docker Desktop with Docker Compose
- GNU Make, if you want to use the Makefile commands

The API image installs Python dependencies automatically. A local Python
installation is only needed when running the application outside Docker.

## Configuration

Create the environment file used by Compose:

```bash
cp exemple.env .env
```

On Windows PowerShell, use:

```powershell
Copy-Item exemple.env .env
```

At minimum, review the database credentials, `CORS_ORIGINS`, storage settings,
model backend URL, and ports in `.env`. The main settings are:

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://user:pswd@db:5432/db` |
| `API_STR` | API route prefix | `/api` |
| `CORS_ORIGINS` | Allowed frontend origins | `["http://localhost:5173"]` |
| `MAX_UPLOAD_SIZE` | Maximum ZIP or image size in bytes | `524288000` |
| `BUCKET_URL` | SeaweedFS S3 endpoint used by the API | `http://seaweedfs:8333` |
| `BUCKET_NAME` | S3 bucket for document files | `documents` |
| `BUCKET_ACCESS_KEY` | S3 access key | `local` |
| `BUCKET_SECRET_KEY` | S3 secret key | `local` |
| `MODEL_BACKEND_URL` | ML backend URL used for transcription jobs | `http://host.docker.internal:8001` |
| `SESSION_COOKIE_SECURE` | Send session cookies only over HTTPS | `false` locally, `true` in production |
| `SESSION_COOKIE_SAMESITE` | Session cookie SameSite policy | `lax` |
| `API_PORT` | Host port for the API | `8000` |
| `DB_PORT` | Host port for PostgreSQL | `5432` |
| `ADMINER_PORT` | Host port for Adminer | `8080` |
| `S3_PORT` | Host port for SeaweedFS S3 | `8333` |

`DATABASE_URL` uses the Compose service name `db` when the API runs in Docker.
If running the API directly on the host, replace `db` with `localhost` and use
`http://localhost:8333` for `BUCKET_URL`. The default frontend runs on port
5173, so its origin must be included in `CORS_ORIGINS` when developing outside
the Docker network.

## Running locally with Docker

From this directory:

```bash
make start
```

This starts the API, PostgreSQL, SeaweedFS, and Adminer. The API container
applies all pending migrations before starting Uvicorn with hot reload.

Equivalent Docker Compose command:

```bash
docker compose -f Docker-compose.yml up -d
```

Useful commands:

```bash
make logs       # Follow all service logs
make build      # Rebuild the API image and start the services
make stop       # Stop services and keep database data
make stop-all   # Stop services and remove containers and volumes
```

The development service mounts `app/` into the API container, so Python code
changes are picked up by Uvicorn without rebuilding the image. PostgreSQL data
is stored in `postgres_data` and object data in `seaweedfs_data`.

## Local development checks

Install the backend development dependencies when running checks outside the
container:

```bash
pip install -r requirements-dev.txt
```

Available Make targets are:

```bash
make format       # Format code and apply safe Ruff fixes
make format-check # Check formatting without changing files
make lint         # Run Ruff checks
make test         # Run pytest
make check        # Run formatting, lint, and tests
```

The frontend is in `../frontend` and uses Vite. From that directory:

```bash
npm install
npm run dev       # Start the frontend at http://localhost:5173
npm run build     # Type-check and create a production build
npm run lint      # Run Oxlint
npm test          # Run Vitest once
```

Vite proxies `/api` requests to `http://127.0.0.1:8000` by default. Set
`API_PROXY_TARGET` in the frontend environment to use another backend URL.

## API overview

With the default `API_STR=/api`, the main endpoints are:

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/users/` | Register a user |
| `GET` | `/api/users/me` | Read the authenticated user |
| `PATCH` | `/api/users/me` | Update the authenticated user |
| `DELETE` | `/api/users/me` | Delete the authenticated user |
| `GET` | `/api/csrf-token` | Create a CSRF token cookie |
| `POST` | `/api/login` | Log in and set the session cookie |
| `POST` | `/api/logout` | Revoke the current session |
| `GET` | `/api/documents/me` | List the current user's documents |
| `POST` | `/api/documents/` | Create document metadata |
| `POST` | `/api/documents/{document_id}` | Upload a ZIP of document images |
| `GET` | `/api/documents/{id}/pages` | List document pages with pagination |
| `GET` | `/api/documents/{id}/pages/{page_id}` | Retrieve a page image |
| `GET` | `/api/documents/{id}/pages/{page_id}/transcription` | Read a page transcription |
| `GET` | `/api/documents/{id}/download` | Download the original ZIP |
| `DELETE` | `/api/documents/{id}` | Delete a document and its pages |
| `POST` | `/api/transcriptions/document/{document_id}` | Start full-document transcription |
| `POST` | `/api/transcriptions/document/{document_id}/pages/{page_id}` | Start transcription for one page |
| `GET` | `/api/transcriptions/jobs/{job_id}` | Read transcription job status |
| `GET` | `/api/iiif/3/{page_id}/info.json` | Read IIIF image metadata |
| `GET` | `/api/iiif/3/{page_id}/{region}/{size}/{rotation}/{quality}.{format}` | Retrieve a transformed IIIF image |
| `GET` | `/api/utils/health-check` | Check API and database availability |
| `GET` | `/api/` | Root endpoint |

Authentication uses an HTTP-only session cookie. State-changing requests are
protected by CSRF middleware and should send the token from the CSRF cookie in
the `X-CSRF-Token` header.

Uploads must be ZIP files containing at least one image. Supported extensions
are `.jpg`, `.jpeg`, `.png`, `.webp`, `.tif`, and `.tiff`; ZIP paths are checked
for traversal, and an archive may contain at most 1,000 files.

## API documentation and database access

Once the services are running:

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- OpenAPI JSON: [http://localhost:8000/api/openapi.json](http://localhost:8000/api/openapi.json)
- Health check: [http://localhost:8000/api/utils/health-check](http://localhost:8000/api/utils/health-check)
- Adminer: [http://localhost:8080](http://localhost:8080)

For Adminer, select `PostgreSQL`, use `db` as the server, and enter the values
from `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.

## Database migrations

Compose applies migrations automatically during API startup. To run Alembic
manually inside the API container:

```bash
docker compose -f Docker-compose.yml exec api alembic current
docker compose -f Docker-compose.yml exec api alembic upgrade head
```

Create a migration after changing the SQLAlchemy models with:

```bash
docker compose -f Docker-compose.yml exec api alembic revision --autogenerate -m "describe the change"
```

Review autogenerated migrations before applying them. The PostgreSQL data lives
in the named `postgres_data` volume.