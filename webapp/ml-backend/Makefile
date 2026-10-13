.PHONY: start build stop logs models


start:
	docker-compose -f Docker-compose.yml up -d

build:
	docker-compose -f Docker-compose.yml up -d --build

stop:
	docker-compose -f Docker-compose.yml down

logs:
	docker-compose -f Docker-compose.yml logs -f

# Copy the models delivered by the ML team into the build context.
models:
	cp ../../ml-models/models/*.mlmodel models/
