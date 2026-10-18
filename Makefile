.PHONY: up dev down reset logs ps tools build-prod

up: ## Levanta todo el entorno local
	docker compose up --build -d
	@echo ""
	@echo "  App ............ http://localhost:3000"
	@echo "  Health ......... http://localhost:3000/api/health"
	@echo "  Mails .......... http://localhost:8025"
	@echo "  Archivos (S3) .. http://localhost:9001/rustfs/console/  (contratos / contratos-local-secret)"
	@echo "  Inngest ........ http://localhost:8288"

dev: ## Igual que up, con hot reload (monta el código; ver docker-compose.dev.yml)
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

down: ## Detiene los contenedores (conserva los datos)
	docker compose down

reset: ## Borra base y archivos locales y vuelve a levantar
	docker compose down -v
	$(MAKE) up

logs: ## Sigue los logs de la app
	docker compose logs -f app

ps:
	docker compose ps

tools: ## Adminer para ver la base en http://localhost:8080
	docker compose --profile tools up -d adminer
	@echo "  Adminer ........ http://localhost:8080  (servidor db, usuario/clave/base: contratos)"

build-prod: ## Construye la imagen de producción (la misma que usa Render)
	docker build --target runner -t contrato-claro:prod .
