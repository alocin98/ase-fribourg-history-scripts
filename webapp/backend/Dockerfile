FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

COPY requirements.txt .

RUN uv pip install --system -r requirements.txt

COPY app ./app
COPY alembic.ini .
COPY alembic ./alembic

# Number of uvicorn worker processes
ENV WEB_CONCURRENCY=2

EXPOSE 8000

# Production start: apply migrations, then serve without reload.
# --proxy-headers makes generated URLs use https when running behind a reverse proxy.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'"]
