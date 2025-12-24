.PHONY: help dev build etl db-migrate db-push db-studio install

help:
	@echo "Affordability Index - Available commands:"
	@echo "  make dev         - Start Next.js dev server"
	@echo "  make build       - Build Next.js app for production"
	@echo "  make etl         - Run Python ETL pipeline"
	@echo "  make db-migrate  - Run Prisma migrations"
	@echo "  make db-push     - Push Prisma schema to database"
	@echo "  make db-studio   - Open Prisma Studio"
	@echo "  make install     - Install all dependencies"

dev:
	cd apps/web && npm run dev

build:
	cd apps/web && npm run build

etl:
	cd etl && python main.py

db-migrate:
	cd apps/web && npx prisma migrate dev

db-push:
	cd apps/web && npx prisma db push

db-studio:
	cd apps/web && npx prisma studio

install:
	cd apps/web && npm install
	cd etl && pip install -r requirements.txt
