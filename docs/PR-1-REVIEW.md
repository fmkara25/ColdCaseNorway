# PR 1 review

Scope: initial archive/overview slice only. No next-stage gameplay or deployment.

## Findings and fixes

- High: detail endpoint serialized the domain entity. No current solution fields existed, but future properties could leak. Added an explicit response allowlist and HTTP contract tests for both endpoints. Internal solutions and unlock-dependent evidence must stay server-side in future work; hiding UI alone is insufficient.
- High: EnsureCreated had no schema upgrade history. Replaced it with a committed initial migration and snapshot, pinned EF tooling, design-time factory and CI drift/script checks. Development migrates automatically; production requires reviewed deployment SQL. Legacy databases need a verified baseline or a non-destructive copy to a new migrated database; documented without deleting data.
- Medium: frontend trusted JSON shape and dates. Added runtime validation and malformed-payload tests. Missing-case responses now lead back to the archive, and 4xx errors are not retried automatically.
- Medium: server errors had no explicit stable Bokmål contract. Added sanitized ProblemDetails responses and a failure test; private exception text is not returned. API responses carry no-store and nosniff headers.
- High: NuGet audit identified vulnerable transitive crypto packages in the initial EF design tooling. Updated EF design/CLI to 10.0.14, pinned patched private crypto dependencies and made moderate/high/critical audit findings fail the infrastructure build.
- Low: a case-specific question was hardcoded into the generic overview. Replaced with a neutral question without adding a story fact.

## Story Bible and limitations

Opening report contains only approved initial facts. No perpetrator, accident, hidden relationship, mileage, late evidence or reconstruction answer is included in public API data or frontend assets. No runtime AI, new character or new event was added. The title remains provisional. Portrait, opening audio and subsequent gameplay are not part of this slice.

These anonymous read-only endpoints intentionally expose only the opening archive; authentication/ownership must be implemented before saved investigations or private progress APIs. This PR does not establish production deployment readiness: infrastructure TLS, secrets, backup/restore operations, production content provisioning and browser acceptance remain deployment/future work.

## Validation

Frontend build, lint and unit tests run locally. Backend HTTP and PostgreSQL migration tests run in GitHub Actions because this editing environment has no .NET SDK or Docker. Merge readiness requires all checks on the latest review commit to pass. No merge is performed.
