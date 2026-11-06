# Cold Case Norway

**[Play the live demo](https://coldcasenorway.onrender.com)** · The first request can take longer while the free hosting instance wakes up.

A full-stack, Norwegian-language mystery game set in a fictional town in Trøndelag. Reopen the 1999 disappearance of Ingrid Solberg, examine the evidence and decide what happened.

![React](https://img.shields.io/badge/React-frontend-263747) ![ASP.NET Core](https://img.shields.io/badge/ASP.NET%20Core-.NET%2010-263747) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-database-263747)

## Gameplay

Open the case file, follow a guided investigation in Norwegian Bokmål, and compare photographs, statements and records. Choose which lead to pursue first, then submit a suspect verdict and an optional theory about what happened. The API evaluates the verdict. Guided progress is saved in the browser, so you can resume or replay the case.

The repository also contains the original investigation workstation with a source-linked timeline, route comparison, a board and notes, interviews, and a final reconstruction.

## Technology stack

| Area | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router, TanStack Query, Zustand, Tailwind CSS |
| Backend | C#, ASP.NET Core Web API (.NET 10), Entity Framework Core, Npgsql |
| Database | PostgreSQL locally and Neon Free in production |
| Infrastructure | Docker, Docker Compose, Nginx for the local playtest |
| Testing | Vitest, xUnit, Playwright, Oxlint |
| CI and hosting | GitHub Actions for verification, Render Free for the live application |

## Architecture

**React → ASP.NET Core API → PostgreSQL (Neon in production)**

The feature-based React frontend calls the API over the same origin in the hosted build. The .NET solution separates HTTP endpoints, application contracts, domain models and persistence into projects that run as one backend. EF Core migrations version the database schema. The workstation stores guest investigation progress in PostgreSQL and associates it with an HttpOnly browser cookie.

## Getting started on Windows

Install Git, Docker Desktop in Linux-container mode, the .NET 10 SDK, and Node.js 22.20 or later in the 22.x line. From PowerShell:

```powershell
git clone https://github.com/fmkara25/ColdCaseNorway.git
Set-Location ColdCaseNorway
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Set `POSTGRES_PASSWORD` in `.env` to a local password. If you already have a working local database volume, keep its existing password. Then run from the repository root:

```powershell
docker compose up -d --wait
$env:ConnectionStrings__ColdCase = 'Host=localhost;Port=5432;Database=coldcase;Username=coldcase'
$localPassword = Read-Host 'Local PostgreSQL password' -AsSecureString
try {
    $env:PGPASSWORD = [pscredential]::new('coldcase', $localPassword).GetNetworkCredential().Password
    dotnet run --project backend/ColdCase.Api --launch-profile http
}
finally {
    Remove-Item Env:PGPASSWORD, Env:ConnectionStrings__ColdCase -ErrorAction SilentlyContinue
}
```

In a second PowerShell terminal, start Vite from the repository root:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Open the URL printed by Vite. Vite proxies `/api` to `http://localhost:5249`. On Development startup, the API applies migrations and seeds the case. Check `http://localhost:5249/api/cases` to verify the API and database together.

### Docker playtest

With Docker Desktop running and the same local `.env` setup, run this from the repository root. This option builds the frontend and API in containers and requires no host Node.js or .NET SDK.

```powershell
docker compose -f compose.yaml -f compose.play.yaml up -d --build --wait --wait-timeout 180
```

Open **http://localhost:8080**. To pause the stack while keeping its local database volume:

```powershell
docker compose -f compose.yaml -f compose.play.yaml stop
```

## Testing and CI

From `frontend/`, run `npm run lint`, `npm test` and `npm run build`. From the repository root, run `dotnet test backend/ColdCase.slnx`. Backend integration tests and local Playwright runs require a dedicated test database. See the [validation and browser acceptance commands](docs/DEVELOPMENT.md#validation).

[GitHub Actions](.github/workflows/ci.yml) checks frontend lint, tests and build, verifies EF Core migration consistency, and runs API and Playwright tests against PostgreSQL. The container job builds the Compose stack and checks that investigation data survives container recreation with the database volume retained.

## Deployment

The live demo uses a Docker-based Render Free web service for the compiled frontend and API, with Neon Free providing persistent PostgreSQL storage. ASP.NET Core serves the compiled React build and the API from the same container. The database is prepared separately from the web process. Database credentials are configured as hosting secrets.

## Project structure

```text
frontend/                     React app, public assets and Playwright tests
backend/
  ColdCase.Api/               ASP.NET Core endpoints
  ColdCase.Application/       Application contracts
  ColdCase.Domain/            Domain models
  ColdCase.Infrastructure/    EF Core persistence and migrations
  ColdCase.Tests/             Backend tests
deploy/                       Production Docker image
docs/                         Development, playtest and asset documentation
scripts/                      Container smoke checks
.github/workflows/            GitHub Actions CI
compose*.yaml                 Local development, playtest and CI services
```

## Technical highlights

- Connected a typed React frontend to an ASP.NET Core API and modeled case data and investigation state in PostgreSQL.
- Used migrations, seed data and isolated PostgreSQL tests to check schema changes and persistence.
- Practiced feature branches, pull requests and automated checks across the frontend, API and containers.
- Deployed a containerized application and debugged database connectivity in production. The liveness endpoint and the database-backed case list helped separate process startup from database access.

## Fictional content

The people, places and events depicted in the investigation are fictional.
