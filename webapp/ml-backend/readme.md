# Fribourg History Scripts ML Backend

The ML backend turns a scanned page into text. It is an internal service that
only the main backend (`webapp/backend`) talks to; it has no database, users or
storage.

## Models

| Task              | Model                                      | Source                                                                    |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| Text segmentation | BLLA (kraken's default baseline segmenter) | bundled with `kraken`                                                     |
| Text recognition  | CATMuS Medieval 1.5.0                      | [Zenodo 10.5281/zenodo.12743230](https://doi.org/10.5281/zenodo.12743230) |

The models are the interface between the ML team and the webapp team. The ML
team delivers them in `ml-models/models/`; this service uses a copy in
`models/`, because Docker can only see files inside `webapp/ml-backend`. After
the ML team updates a model, run `make models` to copy it over, then rebuild.
The `Dockerfile` copies `models/` to `/models` in the image.
CATMuS produces graphematic transcriptions: abbreviations are not expanded and
the output is NFD-normalised.

## Tech stack

- **Python 3.12** and **FastAPI** for the HTTP API
- **kraken 7** (PyTorch, CPU only) for segmentation and recognition
- **Pydantic Settings** for environment-based configuration
- **Docker Compose** for local development

## Running locally

```bash
cp exemple.env .env
make build      # first time: builds the image (~2 GB) and starts the service
make start      # afterwards
make logs
make stop
make models     # copy updated models from ml-models/models
```

The API listens on [http://localhost:8001](http://localhost:8001) and mounts
`app/` for hot reload.

| Variable             | Purpose                                       | Default                           |
| -------------------- | --------------------------------------------- | --------------------------------- |
| `API_STR`            | API route prefix                              | `/api`                            |
| `SEGMENTATION_MODEL` | Path to a segmentation model; empty uses BLLA | empty                             |
| `RECOGNITION_MODEL`  | Path to the recognition model                 | `/models/catmus-medieval.mlmodel` |
| `MAX_UPLOAD_SIZE`    | Maximum image size in bytes                   | `52428800`                        |
| `API_PORT`           | Host port for the API                         | `8001`                            |

## API

| Method | Path                      | Description                                      |
| ------ | ------------------------- | ------------------------------------------------ |
| `POST` | `/api/htr/transcribe`     | Transcribe a page image (multipart field `file`) |
| `GET`  | `/api/utils/health-check` | Check that the models are loaded                 |

```bash
curl -F "file=@page.jpg" http://localhost:8001/api/htr/transcribe
```

```json
{
  "width": 1500,
  "height": 2000,
  "text": "Scientes quia hora est iam nos de somno surgere nunc autem propi\n...",
  "lines": [
    {
      "id": "…",
      "text": "Scientes quia hora est iam nos de somno surgere nunc autem propi",
      "confidence": 0.95,
      "baseline": [
        [210, 238],
        [996, 241]
      ],
      "boundary": [[208, 205], "…"]
    }
  ]
}
```

Lines are returned in reading order; coordinates are pixels of the uploaded
image. Requests are processed one at a time per worker and take roughly 10–20
seconds per page on CPU. The service has no authentication, so it must not be
exposed publicly.
