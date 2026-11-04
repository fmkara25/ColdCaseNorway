# Development

## Current slice

Archive → open case → overview → people register and details. React, TypeScript, Router, Query, Tailwind and the existing .NET 10 solution are preserved. Public case data comes from PostgreSQL through the API; no frontend story fixtures or runtime AI. The initial report is a Bokmål adaptation of the Story Bible, not a new narrative branch. Later tools are explicitly unavailable. The case title is provisional.

This is an initial slice, not the finished 45–60 minute game. Authentication, investigations/save ownership, evidence/unlock rules, interviews, timeline, map routes, board, notes, reconstruction, assets, audio and Azure deployment remain pending. Never include secret solution data in public case responses.

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

Development startup applies committed EF migrations, then inserts the initial case if missing. Production never applies migrations or seeds on web process startup. The seed does not change existing case rows. The initial migration intentionally fails against an unbaselined legacy `Cases` table rather than silently assuming its shape.

### Existing EnsureCreated database (preserve data)

Do not delete the volume/database or run the initial migration blindly. Back up the database and verify the backup is restorable. The safest transition for this small initial slice is to create a **new database name**, apply migrations there, then copy existing `Cases` rows with an explicit column list after schema comparison and validation. Verify row counts/content and switch the connection only after validation; retain the old database for rollback. Alternatively, a DBA can baseline migration history after proving the existing schema exactly matches the initial migration. Never mark a migration as applied without schema verification. No automatic baseline or destructive reset is included in this PR.

### Migration workflow (repository root)

```powershell
dotnet restore backend/ColdCase.slnx
dotnet tool restore
dotnet ef migrations has-pending-model-changes --project backend/ColdCase.Infrastructure
dotnet ef migrations script --idempotent --project backend/ColdCase.Infrastructure --output migrations.sql
```

Review the generated SQL and test it against a restored copy before production. Apply with a dedicated deployment identity; the production web identity needs only access required for reads, not schema-owner credentials. Production case content must be provisioned explicitly from reviewed opening-only data; development seed is not a production content pipeline. PostgreSQL TLS, secret injection, HTTPS termination and same-origin `/api` routing must be configured by the eventual hosting deployment. Vite's proxy is development-only.

For future schema changes, generate and commit a new migration plus snapshot with `dotnet ef migrations add NAME --project backend/ColdCase.Infrastructure`; do not edit an already applied migration. CI rejects model/snapshot drift and runs real PostgreSQL migration/persistence tests.

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

Run the backend command from the repository root. CI provisions its own isolated PostgreSQL service. The persistence test checks migration application/reapplication, model drift, idempotent seeding, case listing, retrieval and missing IDs. API host tests cover response allowlists, missing cases and sanitized server errors. Playwright covers the real archive → overview → person selection/refresh flow and mobile/missing-case behavior against the API and PostgreSQL in CI.

Manual acceptance: archive opens the correct overview; refreshing its URL works in Vite; an unknown case shows a Bokmål error; stopping the API shows retry feedback; narrow screens remain usable; hidden tools do not imply finished gameplay.


## Browser acceptance

With `TEST_DATABASE_CONNECTION` set to a dedicated test database, run from `frontend`:

```powershell
npx playwright install chromium
npm run test:e2e
```

Playwright starts its own API and Vite servers. Stop any existing processes on ports 5249/5173 first. It uses Development migrations and seed against the dedicated test connection, never the production database. People expose only opening introductions; hidden people and future interview revelations are not public API fields.
