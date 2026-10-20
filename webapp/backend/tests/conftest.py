import os

# Settings are read at import time, so provide test values before importing the app.
# Environment variables take precedence over a local .env file.
os.environ.update(
    {
        "DATABASE_URL": "postgresql+asyncpg://test:test@localhost:5432/test",
        "API_STR": "/api",
        "API_TITLE": "Test API",
        "API_DESCRIPTION": "Test API",
        "API_VERSION": "0.0.0",
        "MAX_UPLOAD_SIZE": "1048576",
        "STORAGE_ROOT": "/tmp/ase-test-storage",
    }
)
