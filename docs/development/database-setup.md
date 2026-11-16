# NextUP Database Setup Guide: Supabase PostgreSQL & Local Development

This guide documents the database architecture, Supabase PostgreSQL configuration, local setup, migration workflows, and owner provisioning for NextUP.

---

## 1. Supabase Project Setup & Connection Modes

NextUP uses Supabase strictly as a managed PostgreSQL provider. Django ORM remains the authoritative database layer; no Supabase client libraries or JS client SDKs are used for data access.

### Supabase Connection Modes Explained

Supabase offers three connection options via Supavisor:

1. **Direct Connection (Port 5432 / `db.[ref].supabase.co`)**:
   - Direct connection to PostgreSQL.
   - **Limitation**: Supabase direct connection resolves to IPv6 by default on free/standard tiers. Many cloud PaaS providers (including Render web services unless configured or on specific networks) do not have full IPv6 egress or require dedicated IPv4 add-ons. Direct connections also exhaust database connection limits quickly if Django processes scale.
2. **Session Pooler (Port 5432 / `aws-0-[region].pooler.supabase.com`) - RECOMMENDED**:
   - Connection pooling at the TCP session level via IPv4.
   - Supports prepared statements, Django advisory locks, schema migrations, and session-level features.
   - **Recommended for Django running on Render.**
3. **Transaction Pooler (Port 6543 / `aws-0-[region].pooler.supabase.com`)**:
   - Connection returned to the pool after each transaction.
   - **Warning**: Incompatible with standard Django schema migrations and prepared statements (`SET`, temporary tables, or server-side cursors). If used, `DISABLE_SERVER_SIDE_CURSORS = True` is required, but it is **not recommended** for general Django ORM operations.

### Recommended Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Navigate to **Project Settings** -> **Database** -> **Connection string**.
3. Select **URI** mode and choose **Session pooler** (Port `5432`, IPv4 compatible).
4. Copy the connection URI:
   ```text
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require
   ```

---

## 2. Local Database Configuration

### Option A: Local SQLite (Default for Zero-Setup Development)
If `DATABASE_URL` is omitted from `apps/api/.env`, Django automatically defaults to local SQLite at `apps/api/db.sqlite3`.

### Option B: Local or Remote PostgreSQL
To test against PostgreSQL locally:
1. Copy environment template:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
2. Set your PostgreSQL or Supabase Session Pooler connection URL:
   ```bash
   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require
   DATABASE_SSL_REQUIRE=true
   ```

---

## 3. Database Migration Workflow

Django migrations own all database schema updates. Never manually execute `CREATE TABLE` or alter tables via the Supabase SQL Editor.

```bash
cd apps/api

# 1. Check migration integrity without applying changes
uv run python manage.py makemigrations --check --dry-run

# 2. View pending migrations
uv run python manage.py showmigrations

# 3. Apply migrations to the configured database
uv run python manage.py migrate
```

---

## 4. Single-User Owner Account Provisioning

NextUP is a single-user system initially; public self-registration is closed.

Use the custom idempotent management command `provision_owner`:

### Interactive Mode (Prompt for Password)
```bash
cd apps/api
uv run python manage.py provision_owner --username sid --email sid@example.com --superuser
```

### Non-Interactive Mode (Automated / Scripted)
```bash
export OWNER_USERNAME="sid"
export OWNER_EMAIL="sid@example.com"
export OWNER_PASSWORD="your-strong-random-password"

uv run python manage.py provision_owner --non-interactive --superuser
```

### Safety Features of `provision_owner`:
- Passwords are encrypted using Django's PBKDF2 algorithm; never stored or printed in plain text.
- Idempotent: Re-running with matching credentials succeeds without altering state.
- Conflict detection: Rejects conflicting usernames or emails.
- Does not silently overwrite existing passwords.

---

## 5. Health Checks & Render Deployment

Two endpoints are exposed:
- **Liveness Probe**: `GET /api/health/` (Used by Render's `healthCheckPath`). Returns `200 OK` as long as Django WSGI process responds. Not coupled to database connectivity.
- **Readiness Diagnostic**: `GET /api/health/ready/`. Executes a lightweight `SELECT 1` query to verify database connectivity. Returns `200 OK` when connected or generic `503 Service Unavailable` on connection failure without exposing credentials, hostnames, or tracebacks.

### Render Deployment Configuration
The Render Blueprint in `infrastructure/render/render.yaml` specifies:
- `preDeployCommand: uv run python manage.py migrate --no-input` ensures migrations are applied automatically before new code goes live.
- `healthCheckPath: /api/health/` ensures zero-downtime rolling deploys.
