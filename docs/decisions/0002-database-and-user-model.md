# ADR 0002: Supabase PostgreSQL Foundation & Custom User Model

- **Status**: Accepted
- **Date**: 2026-11-16
- **Context**: Setting up the persistence layer for NextUP, introducing the custom User model before any schema is committed, configuring Supabase connection modes, and establishing secure boundaries for future authentication.

---

## 1. Context & Problem Statement

NextUP requires a robust, relational database foundation that will eventually evolve into a multi-user, AI-assisted productivity system.
Key architectural decisions needed:
1. When and how to implement the custom user model (Django strongly recommends custom user models before initial migrations).
2. Choosing the right connection strategy for Supabase PostgreSQL accessed from Render.
3. Separation of liveness vs. readiness probes.
4. Ensuring zero credential leakage across logs and client-side code.

---

## 2. Decisions

### A. Custom User Model (`modules.accounts.User`)
- Subclasses `django.contrib.auth.models.AbstractUser`.
- Primary Key: `UUIDField(default=uuid.uuid4, editable=False)`. Guarantees non-sequential, globally unique IDs across distributed sync and future mobile clients.
- Unique Email: Standardized with case-insensitive normalization.
- Defined `AUTH_USER_MODEL = "accounts.User"` with an explicit `AppConfig` (`modules.accounts.apps.AccountsConfig`, label `"accounts"`).
- Generated initial migration `modules/accounts/migrations/0001_initial.py` as application migration #1.

### B. Supabase PostgreSQL via Session Pooler
- Supabase is used strictly as a PostgreSQL provider. Django ORM is the single source of truth; no client-side Supabase SDK is used.
- **Connection Mode**: **Session Pooler (Port 5432 / IPv4)** via `aws-0-[region].pooler.supabase.com`.
  - Reason: Supabase direct connection resolves to IPv6, which can face routing issues on cloud container runtimes like Render. Transaction pooler (Port 6543) breaks Django migrations and prepared statements. The session pooler provides full Django ORM/migration compatibility over IPv4.
- In production (`config/settings/production.py`), `DATABASE_URL` is mandatory and requires `ssl_require=True`. SQLite fallback is prohibited in production.

### C. Owner Account Provisioning
- Introduced `provision_owner` management command for single-user owner bootstrapping.
- Accepts credentials via environment variables or interactive prompt; rejects duplicate/conflicting records idempotently.

### D. Liveness vs. Readiness Monitoring
- `GET /api/health/`: Liveness probe for Render process health check. Uncoupled from DB state to prevent cascade restarts during transient database blips.
- `GET /api/health/ready/`: Diagnostic readiness probe performing `SELECT 1` with 10s timeout, returning generic 503 without leaking error details.

---

## 3. Deployment & Authentication Boundaries (Deferred to Task 3)

The application will use Django secure session authentication with HTTP-only cookies:
- **Same-Origin Architecture**: Next.js and Django must share an origin or top-level domain (e.g. `api.planner.domain.com` and `app.planner.domain.com` with `SESSION_COOKIE_DOMAIN=.planner.domain.com`, or via Next.js rewrites/reverse proxy).
- **Separate Domains Risk**: If deployed on disparate domains (`web.onrender.com` vs `api.onrender.com`), browsers block third-party cookies (SameSite=Strict/Lax with cross-origin fetch credentials restrictions), breaking session persistence.
- Implementation of login/logout and session endpoints is deferred to Task 3.

---

## 4. Consequences

- **Positives**:
  - Custom user model introduced cleanly before applying any persistent migrations.
  - No secrets in version control; TLS enforced in production.
  - Full test coverage (25 tests covering UUIDs, constraints, normalization, idempotency, production DB enforcement).
- **Negatives**:
  - Render services need same-origin domain configuration or URL rewrites for seamless cookie-based sessions.
