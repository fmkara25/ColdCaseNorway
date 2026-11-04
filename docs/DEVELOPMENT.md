# Development

## Current implementation

Archive → open case → overview → people register and details → opening evidence reader → source-linked timeline → interactive schematic map/route estimator → server-saved board and notes → gated research and interviews → final reconstruction and epilogue. React, TypeScript, Router, Query, Tailwind and the existing .NET 10 solution are preserved. Public case data comes from PostgreSQL through the API; no frontend story fixtures or runtime AI. The initial report is a Bokmål adaptation of the Story Bible, not a new narrative branch. Later material is unlocked by server-authorized investigation progress.

The complete Case 01 core loop is implemented, with anonymous save ownership, final reconstruction, initial illustrations and optional sound. Human 45–60 minute pacing/acceptance, account-based recovery, deployment hardening and Azure deployment remain pending. Never include secret solution data in public case responses.

For a built frontend/API/database stack without host Node/.NET, see [local Docker playtest](LOCAL_PLAYTEST.md). The commands below remain the hot-reload development workflow.

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

Development startup applies committed EF migrations, then seeds missing case content and reviewed metadata. Production never applies migrations or seeds on web process startup. Seeding updates illustration metadata but does not reset player investigations. The initial migration intentionally fails against an unbaselined legacy `Cases` table rather than silently assuming its shape.

### Existing EnsureCreated database (preserve data)

Do not delete the volume/database or run the initial migration blindly. Back up the database and verify the backup is restorable. The safest transition for this small initial slice is to create a **new database name**, apply migrations there, then copy existing `Cases` rows with an explicit column list after schema comparison and validation. Verify row counts/content and switch the connection only after validation; retain the old database for rollback. Alternatively, a DBA can baseline migration history after proving the existing schema exactly matches the initial migration. Never mark a migration as applied without schema verification. No automatic baseline or destructive reset is included in this PR.

### Migration workflow (repository root)

```powershell
dotnet restore backend/ColdCase.slnx
dotnet tool restore
dotnet ef migrations has-pending-model-changes --project backend/ColdCase.Infrastructure
dotnet ef migrations script --idempotent --project backend/ColdCase.Infrastructure --output migrations.sql
```

Review the generated SQL and test it against a restored copy before production. Apply with a dedicated deployment identity; the production web identity needs case-content reads and investigation reads/writes, not schema-owner credentials. Production case content, including private progression/solution data, must be provisioned explicitly through a reviewed process and protected by the API access filters; development seed is not a production content pipeline. PostgreSQL TLS, secret injection, HTTPS termination and same-origin `/api` routing must be configured by the eventual hosting deployment. Vite's proxy is development-only.

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

Manual acceptance: archive opens the correct overview; refreshing its URL works in Vite; an unknown case shows a Bokmål error; stopping the API shows retry feedback; narrow screens remain usable; new material and the ending stay private until authorized progress.


## Browser acceptance

With `TEST_DATABASE_CONNECTION` set to a dedicated test database, run from `frontend`:

```powershell
npx playwright install chromium
npm run test:e2e
```

Playwright starts its own API and Vite servers. Stop any existing processes on ports 5249/5173 first. It uses Development migrations and seed against the dedicated test connection, never the production database. People expose only opening introductions; hidden people and future interview revelations are not public API fields.


Opening evidence exposes seven initial archive extracts. Read markers are case/session-scoped PostgreSQL progress and can satisfy authored action prerequisites only for accessible evidence. Legacy local reading marks grant no server access. Hidden later evidence is authorized server-side before any body is returned. Native modal dialogs provide keyboard focus containment, Escape-to-close and text enlargement. Browser CI verifies zoom and reading-state persistence.


The opening timeline distinguishes approximate observations, the unknown interval and the scheduled bus; selecting two known times measures an interval without asserting the travel actually happened. Source links point to accessible opening evidence and are checked by persistence tests. No late-game route or accident timestamps are returned.


## Map and consistency model

Map locations and bidirectional roads are case-scoped PostgreSQL entities, with composite foreign keys preventing roads between different cases. Opening responses allowlist public fields and exclude undiscovered places/roads. The route API accepts only IDs, reconstructs distances/times on the server and rejects disconnected or undiscovered paths. It is a stateless read-only calculation, not a progress mutation or proof that someone travelled a route.

The map is deliberately schematic and not to geographic scale; road distances are authoritative. No external map service or paid provider is used. Walking and winter-driving intervals are authored design estimates, not measured historical travel times. RouteConsistencyTests validate positive/ordered estimates, graph connectivity, the opening walking window, odometer tolerance and later chronology/alibi constraints. They establish internal consistency under these assumptions, not empirical realism.

Following author authorization to revise details for consistency, the previous proposed 43.4 km route was replaced by a 43.2 km model. Its critical pickup-to-transaction section permits up to 25 minutes driving plus an explicit 8-minute stop allowance inside 36 minutes, leaving 3 minutes margin. The full estimate differs from the 44 km odometer record by 0.8 km. These are authoring constraints, not additional exact event timestamps in player evidence. Later places remain unavailable until the required server-authorized investigation progress; the browser never receives their coordinates or names in the opening map.


## Anonymous investigation saves

Opening a case creates/resumes a case-scoped anonymous investigation. A random 256-bit capability is held only in an HttpOnly, SameSite=Strict cookie (Secure in production); only its SHA-256 hash is stored in PostgreSQL. Saves expire after 90 days server-side. Clearing browser cookies loses access; no cross-device/account recovery is claimed. Production HTTPS and backups remain deployment requirements.

Board snapshots use a versioned JSONB schema and a row version checked atomically on update. A stale write returns 409 and the frontend preserves its draft. Saving is explicit; navigation away with unsaved edits is guarded. Case ownership, allowed visible references, note sizes, finite coordinates, unique connections and payload limits are checked server-side. Writes require a custom header with no cross-origin CORS policy. Anonymous session creation is rate limited. Future reverse proxies must forward trusted client addresses correctly before internet deployment.

The board persists cards, positions, notes and player hypotheses. Saved source connections can satisfy authored action prerequisites; player-written connection labels are never evaluated as truth. Evidence/interview unlocks are evaluated on the server. Player note text is rendered as plain text, never HTML. API tests cover cookie/header isolation and stale writes; PostgreSQL tests cover persistence and atomic concurrency; browser tests cover drag, connection/note persistence, session isolation and unsaved navigation.


## Deterministic research and interviews

CaseActions stores authored responses and JSONB prerequisites/grants in PostgreSQL. The generic rule evaluator requires reviewed, accessible evidence and actual saved board connections; labels written by the player never grant knowledge. The route-check action verifies the chosen connected route and time-window condition on the server. Progress is private JSONB state updated atomically with the same investigation version as the board. Forged action IDs, hidden reviews and cross-session reads fail closed. Public case endpoints resolve only that request's accessible materials, including map endpoints/edges.

The progress API exposes only currently available action labels and already completed response history, never all rules, prerequisites, grants or future answers. Read markers are now server-backed; old local reading marks are intentionally not imported as trusted progress. Board drafts can conflict after another tab advances progress; they remain protected by the existing 409 workflow.

Story rhythm: independent Maria/Jonas branches, witness/route review, discovery of company records, mileage and terminal cross-references, staged Lars questions, verification of his extra-job claim and his unsolicited detail. Early accusation is a denial, not game over. The late account is presented as a statement to assess against the evidence, not medical proof or an automatic final reconstruction. Exact accident/death timestamps remain unknown. Final reconstruction now independently evaluates the theory, support and route.


## Final reconstruction

CaseSolutions holds the questions, private answer/evidence/route rubric and epilogue in PostgreSQL. Only question labels/choices and accessible source/place labels are exposed after the late-stage gate; answer keys, private source groups and waypoint rubric are never serialized to the client. Equivalent sources are accepted within evidence categories so the player need not guess a single exact combination. The player must select a bounded set of reviewed sources, resolve the main branches and propose a connected complete route whose mileage, order and critical driving/stopping interval fit the authored model. The eight-minute stop allowance is openly disclosed as an estimate rather than a hidden puzzle number.

Incorrect submissions return recoverable feedback without changing progress. An accepted theory and completion flag are saved atomically with optimistic concurrency; the board is preserved. The epilogue is private to that investigation and survives reload. Client route/theory drafts persist only as working hypotheses and grant no server access. It is a reconstruction of the fictional events, not a finding of medical or legal certainty.

The end-to-end acceptance scenario covers opening material, both branches, saved links, route checks, staged statements, wrong-theory recovery, final form/route/source selection, epilogue persistence and another browser's inability to read the ending. This automated scenario does not validate 45–60 minutes of human playtime. Initial archive illustrations and opt-in sound are now included; see [asset provenance and behavior](ASSETS.md). Human playtesting, listening/visual acceptance, further polish, deployment hardening and Azure approval remain pending.

## Keyboard navigation and unexpected UI failures

A shared router frame provides **Hopp til innhold** before the archive/workstation navigation. It becomes visible on keyboard focus and moves focus to the main landmark without adding a hash/history entry. Completed pathname changes move focus to the new workspace; initial page loads, query refreshes and form edits retain normal focus behavior. Blocked unsaved-board navigation therefore does not move focus before the player chooses to leave. Inputs, selects, text areas and sound summaries have a visible focus ring.

A root route error boundary replaces React Router's default developer-oriented failure screen with generic Bokmål recovery controls. It never renders the caught exception, stack or case payload. The error heading labels the focused main landmark. Reload/home recovery does not clear server saves, cookies or local draft storage; volatile unsaved changes may be lost and the screen states this explicitly. Existing API error/retry components and missing-page feedback remain separate. This is UI error containment, not save recovery or a replacement for API authorization.

Browser acceptance checks exercise keyboard skip/navigation focus, active navigation, focus retention during note editing, forced render failure with a private marker, and successful reload recovery. Existing dirty-board navigation and full gameplay scenarios remain regression checks. These checks do not constitute a complete WCAG audit or screen-reader/device certification.

## Built-container validation

CI also builds both application Dockerfiles, checks non-root runtime users, starts the local Compose stack against an isolated database volume, verifies SPA/API/static-asset routing and saves a synthetic note. It then recreates the stack without deleting that volume and verifies the same cookie can recover the note. All browser scenarios run again against the built frontend and reverse proxy using `playwright.container.config.ts`. Local playtest containers explicitly use Development mode for migrations, seed and HTTP guest cookies; this configuration is not an internet deployment.

## Investigation desk — approved UX migration, stage 1

The case landing route now presents a fixed-viewport desk and a focused document/decision modal. Papers, source text, portraits and currently available follow-ups come from the existing authorized API responses; no Case 01 story or solution is hardcoded into the desk. Three documents are shown per tray with explicit paging, not viewport scrolling. Documents have their own scroll/zoom pane. Native dialogs provide keyboard containment, Escape and return to the selected object.

Taking a source into consideration uses the existing server review command; it does not certify that the source is true. Available research uses existing action IDs and unlock rules. Successful actions display their authored response and newly accessible evidence/person objects before returning to the desk. Progress and material authorization remain server-side, and existing saves/migrations are unchanged. New discoveries are not preloaded as hidden client-side content.

The old category sidebar is replaced by a secondary Mappen drawer. Existing people/evidence/timeline/map/board/notes/reconstruction routes are preserved inside an independently scrollable tool window during the staged redesign. Those tools have not yet received the desk interaction treatment. The archive entry remains unchanged. There are no new persistent dialogue approaches or consequence mechanics in this stage: those require a later reviewed server-side model, not a cosmetic frontend claim.

Acceptance checks cover 1366×768, 1920×1080 and 390×844 outer viewport bounds, document-only scrolling/zoom, keyboard dialog return, a source-to-research-to-new-object flow, persisted review/action history and hidden late evidence. Container CI retains desk/inspection screenshots for visual review. Full-case, anonymous isolation, unsaved-board and sound checks continue to run against both development and compiled container stacks. Human approval of the first playable desk is required before proceeding to the larger interview/choice redesign.
