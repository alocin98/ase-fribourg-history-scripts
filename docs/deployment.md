# Deployment

Operational reference for the production deployment of **manuscript-ai**.

- **URL:** https://manuscript-ai.coffee-journal.com (API under `/api`, OpenAPI docs at `/api/docs`)
- **Server / platform:** coffee-journal, Coolify 4.0.0 (server `localhost`, uuid `joc8o0k`, destination `localhost-coolify` / `uo8s80g`)
- **CLI:** Coolify CLI 1.8.0, context `coffee-journal` — docs: https://github.com/coollabsio/coolify-cli/blob/main/llms.txt
- **Project / environment:** `manuscript-ai` (`yof6mm2sp64ypybzuc4lmim8`) / `production` (`udwq01k7glofrddw28nc4jmk`)
- **Source:** `alocin98/ase-fribourg-history-scripts`, branch `main`, via GitHub App `alocin98` (`aoc44w0`)
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
