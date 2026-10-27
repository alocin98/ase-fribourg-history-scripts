start:
	docker-compose -f Docker-compose.yml up -d

build:
	docker-compose -f Docker-compose.yml up -d --build

stop:
	docker-compose -f Docker-compose.yml down

stop-all:
	docker-compose -f Docker-compose.yml down --volumes --remove-orphans

logs:
	docker-compose -f Docker-compose.yml logs -f
# --- Code quality (run locally with: pip install -r requirements-dev.txt) ---
.PHONY: format format-check lint test check

format:
	ruff format .
	ruff check --fix .

format-check:
	ruff format --check .

lint:
	ruff check .

test:
	pytest

check: format-check lint test
