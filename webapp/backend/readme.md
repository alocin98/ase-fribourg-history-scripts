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
- **Docker Compose** for local development, with Adminer for database inspection
- Local filesystem storage for uploaded ZIP archives and extracted page images

## Architecture

Requests enter through `app/main.py`, where the FastAPI application configures
CORS and CSRF middleware and mounts the API router under `API_STR` (normally
`/api`). Route handlers validate requests and delegate persistence to repository
classes. SQLAlchemy models describe the database tables, while Pydantic schemas
define the request and response shapes.

Document files are stored on disk rather than in PostgreSQL. Each upload gets a
UUID directory containing the original ZIP and a `pages/` directory containing
validated image files. The database stores the document metadata and paths.

## Project structure

```text
backend/
├── app/
│   ├── main.py                 # FastAPI application, middleware, router setup
│   ├── api/
│   │   ├── deps.py             # Database and authentication dependencies
│   │   ├── main.py             # API router aggregation
│   │   ├── routes/
│   │   │   ├── documents.py    # Uploads, document listing, pages, downloads
│   │   │   ├── login.py        # Login, logout, and CSRF token endpoints
│   │   │   ├── user.py         # Registration and current-user endpoints
│   │   │   └── utils.py        # Health check endpoint
│   │   └── schemas/            # Pydantic request and response models
│   ├── core/
│   │   ├── config.py           # Environment-backed application settings
│   │   ├── db.py               # Async SQLAlchemy engine and sessions
│   │   ├── middleware.py       # CSRF protection
│   │   └── security.py         # Password and CSRF helpers
│   ├── models/                 # SQLAlchemy database models
│   └── repositories/           # Database access and persistence operations
├── alembic/
│   ├── env.py                  # Migration environment
│   └── versions/               # Versioned database migrations
├── storage/                    # Uploaded documents (mounted at /data/documents)
├── Docker-compose.yml          # Development API, PostgreSQL, and Adminer services
├── Dockerfile                  # Production-oriented API image
├── requirements.txt            # Python dependencies
├── Makefile                    # Common Docker Compose commands
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

At minimum, review the database credentials, `CORS_ORIGINS`, and ports in `.env`.
The main settings are:

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | Async PostgreSQL connection string | `postgresql+asyncpg://user:pswd@db:5432/db` |
| `API_STR` | API route prefix | `/api` |
| `CORS_ORIGINS` | Allowed frontend origins | `["http://localhost:3000"]` |
| `STORAGE_ROOT` | Directory for uploaded files | `/data/documents` |
| `MAX_UPLOAD_SIZE` | Maximum ZIP or image size in bytes | `524288000` |
| `SESSION_COOKIE_SECURE` | Send session cookies only over HTTPS | `false` locally, `true` in production |
| `SESSION_COOKIE_SAMESITE` | Session cookie SameSite policy | `lax` |
| `API_PORT` | Host port for the API | `8000` |
| `DB_PORT` | Host port for PostgreSQL | `5432` |
| `ADMINER_PORT` | Host port for Adminer | `8080` |

`DATABASE_URL` uses the Compose service name `db` when the API runs in Docker.
If running the API directly on the host, replace `db` with `localhost`.

## Running locally with Docker

From this directory:

```bash
make start
```

This starts the API, PostgreSQL, and Adminer. The API container applies all
pending migrations before starting Uvicorn with hot reload.

Equivalent Docker Compose command:

```bash
docker compose -f Docker-compose.yml up -d
```

Useful commands:

```bash
make logs       # Follow all service logs
make build      # Rebuild the API image and start the services
make stop       # Stop services and keep database data
make stop-all   # Stop services and remove containers and database volume
```

The development service mounts `app/` and `storage/` into the container. Code
changes are therefore picked up by Uvicorn without rebuilding the image.

## API overview

With the default `API_STR=/api`, the main endpoints are:

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/users/` | Register a user |
| `GET` | `/api/users/me` | Read the authenticated user |
| `PATCH` | `/api/users/me` | Update the authenticated user |
| `GET` | `/api/csrf-token` | Create a CSRF token cookie |
| `POST` | `/api/login` | Log in and set the session cookie |
| `POST` | `/api/logout` | Revoke the current session |
| `GET` | `/api/documents/me` | List the current user's documents |
| `POST` | `/api/documents/` | Upload a ZIP of document images |
| `GET` | `/api/documents/{id}/pages` | List document pages with pagination |
| `GET` | `/api/documents/{id}/pages/{page_id}` | Retrieve a page image |
| `GET` | `/api/documents/{id}/download` | Download the original ZIP |
| `GET` | `/api/utils/health-check` | Check API and database availability |

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