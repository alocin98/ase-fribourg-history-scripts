# Backend

Here is the backend of the web application. It is built using FastAPI and uses PostgreSQL as the database.

## Installation

You only need `Docker` and `docker-compose` installed to deploy the backend.

## Running the backend

To run the backend, you can use the following command:

```bash
make start
```

or to use `docker-compose` directly:

```bash
docker-compose -f Docker-compose.yml up -d
```

To stop the backend, you can use the following command:

```bash
make stop
```

or to use `docker-compose` directly:

```bash
docker-compose -f Docker-compose.yml down
```

## Configuration

Everything is configured using environment variables. You can find an example of the environment variables in the `exemple.env` file. You can copy this file to `.env` and modify the values as needed.
To change the port of the database and the backend, you can update the `.env` file accordingly (Do not forget to update the port in the DATABASE_URL).

## API Documentation

The API documentation is available at `/docs` when the backend is running. You can access it by navigating to [`http://localhost:8000/docs`](http://localhost:8000/docs) in your web browser by default.