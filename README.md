# Affordability Index

A public web app showing home affordability (home value to income ratio) across US cities and ZIP areas.

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL (see database options below)

### Choose a Database

You need a PostgreSQL database. Pick one of these options:

#### Option A: Docker (Easiest for local dev)
**Requirements:** Docker Desktop installed

```bash
docker compose up -d
```

Uses credentials from `.env.example` (user/password/affordability_index on localhost:5432).

#### Option B: Local PostgreSQL
**Requirements:** PostgreSQL installed on your machine

1. Create a database: `createdb affordability_index`
2. Edit `.env` with your connection string:
   ```
   DATABASE_URL="postgresql://youruser:yourpass@localhost:5432/affordability_index"
   ```

#### Option C: Hosted PostgreSQL (Recommended for hobby projects)
**Free tiers available:**
- [Neon](https://neon.tech) - Serverless Postgres
- [Supabase](https://supabase.com) - Full backend platform
- [Railway](https://railway.app) - Easy deployment

1. Create a database on your chosen platform
2. Copy the connection string to `.env`:
   ```
   DATABASE_URL="postgresql://..."
   ```

### Setup

1. **Install dependencies:**
```bash
cd apps/web && npm install && cd ../..
cd etl && pip install -r requirements.txt && cd ..
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your DATABASE_URL (see "Choose a Database" above)
```

3. **Test database connection:**
```bash
npm run db:push
```

This creates the database schema. If successful, you're ready to go!

4. **Start dev server:**
```bash
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
/apps/web       - Next.js frontend + API
/etl            - Python ETL pipeline
/docs           - Documentation
CLAUDE.md       - Project scope and design decisions
```

## Development Commands

### Web Application:
```bash
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run lint         # Run ESLint
```

### Database:
```bash
npm run db:push      # Push schema to database (for development)
npm run db:migrate   # Create and run migrations (for production)
npm run db:studio    # Open Prisma Studio (GUI)
npm run db:generate  # Generate Prisma client
```

### ETL Pipeline:
```bash
# Dry-run mode (no actual downloads or database writes)
python etl/main.py --dry-run

# Full pipeline (not yet implemented)
npm run etl
```

### Docker (Optional):
```bash
docker compose up -d       # Start PostgreSQL (if using Option A)
docker compose down        # Stop PostgreSQL
docker compose logs -f     # View logs
```

### Using Makefile (alternative):
```bash
make dev             # Start Next.js dev server
make build           # Build for production
make db-migrate      # Run Prisma migrations
make db-push         # Push schema to database
make db-studio       # Open Prisma Studio
make etl             # Run ETL pipeline
make install         # Install all dependencies
```

## Data Sources

- **Home Values:** Zillow Home Value Index (ZHVI)
- **Income:** US Census Bureau American Community Survey (ACS) Table B19013

See [CLAUDE.md](./CLAUDE.md) for detailed data source information and methodology.

## Tech Stack

- **Frontend:** Next.js 15 (React, TypeScript, Tailwind CSS)
- **Database:** PostgreSQL + Prisma ORM
- **ETL:** Python (pandas, DuckDB)

## License

MIT
