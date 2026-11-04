# Local Docker playtest

This runs the current game on your own Windows computer, with a built React frontend, ASP.NET API and PostgreSQL. It does not create a public URL or any Azure resources. Docker Desktop must be running in Linux-container mode. Host Node/.NET installations are not required for this workflow.

## Update without discarding work

From PowerShell in your existing repository (for example `C:\Users\fmkar\Documents\ColdCaseNorway`):

```powershell
git status
git switch main
git pull --ff-only
```

Do not use reset/clean or overwrite local changes if Git reports a conflict. Keep your existing clone and `.env`; do not start over. The Docker workflow reuses the `postgres-data` volume from the existing Compose project when launched from the same directory/project name.

## First-time configuration

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

If this is a new database, replace the placeholder `POSTGRES_PASSWORD` with your own local password, save and close the editor. If you already have a working database volume, retain its existing password: changing `.env` does not change the stored database user's password. Never commit/share `.env` or terminal dumps of resolved Compose configuration. For passwords containing `$` or `#`, use a single-quoted dotenv value so Compose treats it literally. Do not modify or delete the volume to resolve a password error.

The local API receives the password separately as `PGPASSWORD`, so semicolons/quotes are not interpreted as connection-string parameters. Environment-based credentials are a local-development convenience, not a production secret-management design.

## Start and open

```powershell
docker compose -f compose.yaml -f compose.play.yaml up -d --build --wait --wait-timeout 180
```

The first build downloads SDK/runtime images and npm dependencies and can take several minutes. Once the command succeeds, open **http://localhost:8080**. Open the case, inspect people/documents and try the timeline/map/board. Sound starts off; **Lyd: av → Slå på lyd** enables it. Use a single hostname consistently: switching between `localhost` and `127.0.0.1` creates a separate browser cookie/save identity.

If port 8080 is occupied, add `COLDCASE_PORT=8081` to `.env`, rerun the command and open http://localhost:8081. PostgreSQL retains its existing loopback port 5432. Stop a conflicting local PostgreSQL instance rather than deleting data. The app port binds only to loopback, and the API has no published host port. This is intended for your own computer, not access from another device.

## Stop, resume and troubleshoot

```powershell
# Stop services without deleting containers or the database volume.
docker compose -f compose.yaml -f compose.play.yaml stop
# Resume; migrations/seed preserve investigations.
docker compose -f compose.yaml -f compose.play.yaml up -d --wait --wait-timeout 180
# Show service status.
docker compose -f compose.yaml -f compose.play.yaml ps
# Inspect startup failures locally. Redact sensitive data before sharing logs.
docker compose -f compose.yaml -f compose.play.yaml logs --tail 80 api web
```

Do not run `down -v`, volume removal or database reset. Saved board/notes and progress live in PostgreSQL; save board edits explicitly before stopping. The anonymous save key lives in your browser cookie. Clearing cookies, incognito mode or another browser starts a different investigation; keeping the volume alone cannot recover a lost browser key. Any legacy EnsureCreated database requires the non-destructive migration procedure in [DEVELOPMENT.md](DEVELOPMENT.md), not a reset.

## Scope and validation

The web image serves Vite's compiled output with nginx and forwards `/api/` to the API on the same origin, preserving cookie/header behavior. Deep game URLs fall back to the SPA index; missing API routes and image files do not. Application containers run as non-root users with read-only root filesystems and temporary writable `/tmp`. The web healthcheck queries the seeded case list through the proxy/API/database before the stack is considered ready.

This Compose overlay explicitly uses ASP.NET Development so the existing reviewed local migration/seed and HTTP guest-cookie behavior work. It must not be published to the internet. Production content provisioning, a restricted database identity, HTTPS, trusted-proxy rate limiting, backups, secret management and approved Azure deployment remain separate work. No production startup behavior was changed.

CI builds the images and runs all browser scenarios against them, then verifies synthetic save persistence across full stack recreation with the database volume retained. The same browser suite also continues to run against the existing development stack. Human acceptance still needs to assess reading comfort, audio comfort, puzzle clarity, story consistency and actual 45–60 minute playtime; automated success is not a measurement of those qualities.
