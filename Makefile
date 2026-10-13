BACKEND_DIR := webapp/backend
FRONTEND_DIR := webapp/frontend
ML_BACKEND_DIR := webapp/ml-backend

.PHONY: start backend frontend ml-backend build stop stop-all logs install check-env check-ml-env

# Start the backend containers in the background, then the frontend dev server.
start: backend frontend

backend: check-env
	$(MAKE) -C $(BACKEND_DIR) start

# The ML backend is started separately: its image is large and slow to build.
ml-backend: check-ml-env
	$(MAKE) -C $(ML_BACKEND_DIR) build

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
	-$(MAKE) -C $(ML_BACKEND_DIR) stop

stop-all:
	$(MAKE) -C $(BACKEND_DIR) stop-all

logs:
	$(MAKE) -C $(BACKEND_DIR) logs

check-env:
	@test -f $(BACKEND_DIR)/.env || { echo "Missing $(BACKEND_DIR)/.env — run: cp $(BACKEND_DIR)/exemple.env $(BACKEND_DIR)/.env"; exit 1; }

check-ml-env:
	@test -f $(ML_BACKEND_DIR)/.env || { echo "Missing $(ML_BACKEND_DIR)/.env — run: cp $(ML_BACKEND_DIR)/exemple.env $(ML_BACKEND_DIR)/.env"; exit 1; }
