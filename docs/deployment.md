# Deployment

Operational reference for the deployments of **manuscript-ai**. There are two environments in the same Coolify project:

| Environment | Branch | URL |
|---|---|---|
| `production` | `main` | https://manuscript-ai.coffee-journal.com |
| `dev` | `dev` | https://manuscript-ai-dev.coffee-journal.com |

Workflow: merge feature branches into `dev`, check them on the dev URL, then merge `dev` into `main` to release. The two environments share nothing (separate database, volume and secrets). The sections below describe production; see [Dev environment](#dev-environment) for the differences.

- **URL:** https://manuscript-ai.coffee-journal.com (API under `/api`, OpenAPI docs at `/api/docs`)
- **Server / platform:** coffee-journal, Coolify 4.0.0 (server `localhost`, uuid `joc8o0k`, destination `localhost-coolify` / `uo8s80g`)
- **CLI:** Coolify CLI 1.8.0, context `coffee-journal` — docs: https://github.com/coollabsio/coolify-cli/blob/main/llms.txt
- **Project / environments:** `manuscript-ai` (`yof6mm2sp64ypybzuc4lmim8`) / `production` (`udwq01k7glofrddw28nc4jmk`), `dev` (`y5yvwlceqpjsn39oxxdeao3r`)
- **Source:** `alocin98/ase-fribourg-history-scripts`, branch `main` (production) / `dev` (dev), via GitHub App `alocin98` (`aoc44w0`)
- **Deployed revision:** `0592c2e` (2026-09-29)

## Resources

| Resource | UUID | Type | Details |
|---|---|---|---|
| `manuscript-ai-frontend` | `c10etj1vyri1znt4x44womdi` | Dockerfile, base `/webapp/frontend` | nginx on port 80, domain `https://manuscript-ai.coffee-journal.com`, health check `/` |
| `manuscript-ai-backend` | `w2k4ch2ikgw8ahv93qjmg90f` | Dockerfile, base `/webapp/backend` | FastAPI on port 8000, domain `https://manuscript-ai.coffee-journal.com/api`, **Strip Prefixes off** (UI only, Advanced tab), Coolify health check off (no curl in image) |
| `manuscript-ai-db` | `jyu0wmqh0olcosb8c6vj6xzk` | Standalone PostgreSQL (`postgres:16-alpine`) | database `manuscript_ai`, user `manuscript`, not public; internal host = its UUID |

**Persistent storage:** backend volume `w2k4ch2ikgw8ahv93qjmg90f-manuscript-ai-documents` mounted at `/data/documents` (uploaded ZIPs and page images). Database data lives in the Coolify-managed Postgres volume.

**DNS / HTTPS:** covered by the existing wildcard `*.coffee-journal.com → 159.69.22.208`; Let's Encrypt certificate issued by Coolify's Traefik proxy.

## Configuration

Backend environment variables (values only in Coolify; template in `webapp/backend/production.env.example`):

`DATABASE_URL` (must use `postgresql+asyncpg://`), `DB_ECHO`, `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `API_STR`, `API_TITLE`, `API_DESCRIPTION`, `API_VERSION`, `CORS_ORIGINS`, `STORAGE_ROOT`, `MAX_UPLOAD_SIZE`, `DEFAULT_USER`, `DEFAULT_PASSWORD` (required by settings, unused).

The frontend needs no runtime variables; it calls `/api` on the same origin.

## Deploy

```bash
C="--context coffee-journal"
coolify $C deploy uuid w2k4ch2ikgw8ahv93qjmg90f   # backend
coolify $C deploy uuid c10etj1vyri1znt4x44womdi   # frontend
coolify $C app deployments logs <app-uuid>
coolify $C app logs <app-uuid>
coolify $C app env list w2k4ch2ikgw8ahv93qjmg90f
```

(In zsh, write the `--context coffee-journal` flag out instead of using `$C`.)

**Migrations** run automatically on every backend start (`alembic upgrade head` in the Dockerfile `CMD`). Current head: `ba71ea69398a`. No seed data; users register through the app.

## Verification (2026-09-29)

- Frontend `/` and SPA routes → 200 over HTTPS; certificate valid until 2026-12-28.
- `GET /api/utils/health-check` → 200 `true`; migration `ba71ea69398a` applied on first start.
- Smoke test: register → login (wrong password 401) → `/users/me` → ZIP upload → list → page image (https URL) → download (byte-identical); unauthenticated access → 401.
- Backend restart → healthy again. Survival of uploaded files across the restart was **not** verified directly.
- Smoke-test data (user `88691f1e-…`, document `7f970ad9-…`) left for manual cleanup via the Coolify terminal.

## Rollback

- App: `coolify app update <app-uuid> --git-commit-sha <sha>` then `coolify deploy uuid <app-uuid>`; clear the SHA afterwards to follow `main` again.
- Schema: there is only one migration; a downgrade would drop all tables, so restore from a backup instead.
- Full removal: delete the resources of project `manuscript-ai` (affects no other project).

## Backups

- Schedule `eu4drfefcnn7736vdea93x4d` on `manuscript-ai-db`: daily at 03:00, database `manuscript_ai`, 7 local copies, S3 off (S3 storages are not exposed by this Coolify version's API — attach one in the UI for off-site copies).
- First backup triggered manually 2026-09-29 08:11 UTC → `success` (6 KB, stored under `/data/coolify/backups/databases/root-team-0/manuscript-ai-db-jyu0wmqh0olcosb8c6vj6xzk/`). It contains the smoke-test rows.
- Uploaded files in `/data/documents` are **not** backed up.

```bash
coolify --context coffee-journal database backup trigger jyu0wmqh0olcosb8c6vj6xzk eu4drfefcnn7736vdea93x4d
# CLI 1.8.0 fails to parse executions on Coolify 4.0.0; query the API instead:
# GET /api/v1/databases/jyu0wmqh0olcosb8c6vj6xzk/backups/eu4drfefcnn7736vdea93x4d/executions
```

## Dev environment

Same setup as production, in environment `dev` (`y5yvwlceqpjsn39oxxdeao3r`) of project `manuscript-ai`, built from branch **`dev`**.

| Resource | UUID | Details |
|---|---|---|
| `manuscript-ai-dev-frontend` | `ujptw8xbyahn8vrjfiyk3334` | base `/webapp/frontend`, port 80, domain `https://manuscript-ai-dev.coffee-journal.com`, health check `/` |
| `manuscript-ai-dev-backend` | `yae4jo009ctaitxisw52buqs` | base `/webapp/backend`, port 8000, domain `https://manuscript-ai-dev.coffee-journal.com/api`, **Strip Prefixes off** (UI only), health check off |
| `manuscript-ai-dev-db` | `pm8oo4t1t5hhp2m7xw3ob2lz` | `postgres:16-alpine`, database `manuscript_ai`, user `manuscript`, not public |

- **Storage:** backend volume mounted at `/data/documents`.
- **DNS:** `manuscript-ai-dev` is a single-level subdomain, so the `*.coffee-journal.com` wildcard covers it (`dev.manuscript-ai…` would not be).
- **Env vars:** same names as production (template `webapp/backend/dev.env.example`), with their own `DATABASE_URL` (host = dev DB UUID), `SECRET_KEY`, `DEFAULT_USER`/`DEFAULT_PASSWORD`, and `CORS_ORIGINS=["https://manuscript-ai-dev.coffee-journal.com"]`.
- **Auto-deploy:** pushes to `dev` trigger a deploy through the GitHub App, just as pushes to `main` do for production.
- **No backups** are scheduled for the dev database.

```bash
coolify --context coffee-journal deploy uuid yae4jo009ctaitxisw52buqs   # dev backend
coolify --context coffee-journal deploy uuid ujptw8xbyahn8vrjfiyk3334   # dev frontend
```
