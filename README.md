# Cold Case Norway

Cold Case Norway is a browser-based interactive investigation game focused on reopening fictional cold cases set in Norway.

Players investigate cases through documents, photographs, people, evidence, interviews, timelines, maps, notes, and logical connections before building a final reconstruction of the events.

## Case 01

**Case ID:** 1999-1218  
**Working title:** The Skardal Disappearance  
**Location:** Skardal, Trøndelag (fictional)  
**Date:** December 18, 1999

The first case follows the disappearance of 23-year-old Ingrid Solberg.

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- Tailwind CSS

### Backend

- C#
- ASP.NET Core Web API (.NET 10)
- Entity Framework Core
- Anonymous investigation sessions with HttpOnly cookies (account/Identity support planned)

### Database

- PostgreSQL

### Testing

- xUnit
- Vitest
- Playwright

### DevOps & Cloud

- Docker
- Docker Compose
- GitHub Actions
- Microsoft Azure (deployment planned; not yet provisioned)

## Architecture

The backend follows a pragmatic Clean Architecture approach within a modular monolith.

The frontend uses a feature-based architecture.

## Status

The Case 01 core loop includes archive/overview, people, evidence, timeline, route analysis, a saved board/notes, gated research/interviews and final reconstruction. Automated API/PostgreSQL/browser checks cover the case-to-epilogue flow. See [development setup and validation](docs/DEVELOPMENT.md). Bundled fictional archive illustrations and optional procedural ambient/paper sound are included; see [asset provenance](docs/ASSETS.md). Human playtime, listening/visual acceptance, deployment hardening and Azure deployment are still pending.
