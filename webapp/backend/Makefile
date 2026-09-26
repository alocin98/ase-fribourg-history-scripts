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