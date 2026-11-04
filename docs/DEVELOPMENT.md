# Development

## Current slice

Archive → open case → overview. React, TypeScript, Router, Query, Tailwind and the existing .NET 10 solution are preserved. Public case data comes from PostgreSQL through the API; no frontend story fixtures or runtime AI. The initial report is a Bokmål adaptation of the Story Bible, not a new narrative branch. Later tools are explicitly unavailable. The case title is provisional.

This is an initial slice, not the finished 45–60 minute game. Authentication, investigations/save ownership, evidence/unlock rules, people, interviews, timeline, map routes, board, notes, reconstruction, assets, audio and Azure deployment remain pending. Never include secret solution data in public case responses.

## Local startup (PowerShell, repository root)

Prerequisites: Node 22.12+, .NET SDK 10, Docker Desktop.

```powershell
Copy-Item .env.example .env
# Edit .env and choose your local PostgreSQL password.
docker compose up -d --wait
$env:ConnectionStrings__ColdCase = "Host=localhost;Port=5432;Database=coldcase;Username=coldcase;Password=YOUR_LOCAL_PASSWORD"
dotnet run --project backend/ColdCase.Api --launch-profile http
```

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open the Vite URL printed by the terminal. Vite proxies `/api` to `http://localhost:5249`; no cross-origin browser access is needed. Direct API checks: `/api/health`, `/api/cases`, `/api/cases/1999-1218`. Health is process liveness, not database readiness.

Development startup creates the schema and inserts the initial case if missing. `EnsureCreated` is a temporary bootstrap for this initial schema only. Before evolving an existing database, replace it with reviewed EF migrations; do not mix migrations and EnsureCreated. Production does not initialize or seed automatically.

Database binds only to loopback. `.env` is ignored. Do not put actual credentials in appsettings, Git, screenshots or terminal output. This setup provisions no Azure resources.

## Validation

```powershell
cd frontend
npm run build
npm run lint
npm test
```

Backend integration tests require a **separate** PostgreSQL test database:

```powershell
# Create the test database in the running local PostgreSQL container.
docker compose exec database createdb -U coldcase coldcase_test
$env:TEST_DATABASE_CONNECTION = "Host=localhost;Database=coldcase_test;Username=coldcase;Password=YOUR_LOCAL_PASSWORD"
dotnet test backend/ColdCase.slnx
```

Run the backend command from the repository root. CI provisions its own isolated PostgreSQL service. The persistence test checks idempotent seeding, case listing, retrieval and missing IDs. It does not establish API or browser end-to-end coverage.

Manual acceptance: archive opens the correct overview; refreshing its URL works in Vite; an unknown case shows a Bokmål error; stopping the API shows retry feedback; narrow screens remain usable; hidden tools do not imply finished gameplay.
