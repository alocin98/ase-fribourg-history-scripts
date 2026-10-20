BACKEND_DIR := webapp/backend
FRONTEND_DIR := webapp/frontend

.PHONY: start backend frontend build stop stop-all logs install check-env format lint test check

# Start the backend containers in the background, then the frontend dev server.
start: backend frontend

backend: check-env
	$(MAKE) -C $(BACKEND_DIR) start

frontend: $(FRONTEND_DIR)/node_modules
	cd $(FRONTEND_DIR) && npm run dev

# Rebuild the backend image before starting everything.
build: check-env
	$(MAKE) -C $(BACKEND_DIR) build
	$(MAKE) frontend

# Build the backend image (installs requirements.txt) and the frontend packages.
install: check-env
	cd $(BACKEND_DIR) && docker-compose -f Docker-compose.yml build
	cd $(FRONTEND_DIR) && npm install

$(FRONTEND_DIR)/node_modules: $(FRONTEND_DIR)/package.json $(FRONTEND_DIR)/package-lock.json
	cd $(FRONTEND_DIR) && npm install
	@touch $@

stop:
	$(MAKE) -C $(BACKEND_DIR) stop

stop-all:
	$(MAKE) -C $(BACKEND_DIR) stop-all

logs:
	$(MAKE) -C $(BACKEND_DIR) logs

check-env:
	@test -f $(BACKEND_DIR)/.env || { echo "Missing $(BACKEND_DIR)/.env — run: cp $(BACKEND_DIR)/exemple.env $(BACKEND_DIR)/.env"; exit 1; }

# --- Code quality (same checks as CI) ---
# Backend tools come from requirements-dev.txt: pip install -r webapp/backend/requirements-dev.txt

format: $(FRONTEND_DIR)/node_modules
	$(MAKE) -C $(BACKEND_DIR) format
	cd $(FRONTEND_DIR) && npm run format

lint: $(FRONTEND_DIR)/node_modules
	$(MAKE) -C $(BACKEND_DIR) lint
	cd $(FRONTEND_DIR) && npm run lint && npm run typecheck

test: $(FRONTEND_DIR)/node_modules
	$(MAKE) -C $(BACKEND_DIR) test
	cd $(FRONTEND_DIR) && npm test

check: $(FRONTEND_DIR)/node_modules
	$(MAKE) -C $(BACKEND_DIR) check
	cd $(FRONTEND_DIR) && npm run format:check && npm run lint && npm run typecheck && npm test
