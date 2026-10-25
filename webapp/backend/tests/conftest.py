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
        "BUCKET_URL": "http://localhost:9000/documents",
        "BUCKET_NAME": "documents",
        "BUCKET_ACCESS_KEY": "test-access-key",
        "BUCKET_SECRET_KEY": "test-secret-key",
    }
)
