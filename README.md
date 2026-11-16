# NextUp: Production-Ready Personal Planner Monorepo

NextUp is a modular personal productivity and planning application designed to evolve into an AI-powered personal assistant.

## Tech Stack

- **Backend**: Python 3.12+, Django, Django REST Framework, WhiteNoise, Gunicorn
- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **Database**: Supabase PostgreSQL (Managed, external, accessed via Session Pooler)
- **Authentication**: Django session-based authentication with secure HTTP-only cookies
- **Hosting**: Render
- **Package Management**: `uv` for Python (`apps/api`), `npm` for frontend (`apps/web`)
- **CI/CD**: GitHub Actions
- **Future Extensions**: React Native / Expo (mobile), Celery + Redis (background jobs), LangGraph (AI orchestration)

---

## Repository Structure

```text
personal-planner/
├── apps/
│   ├── web/                     # Next.js App Router application
│   │   ├── src/
│   │   │   ├── app/             # App Router pages and layouts
│   │   │   ├── components/      # UI, layout, and shared components
│   │   │   ├── features/        # Feature-driven slices
│   │   │   ├── hooks/           # Reusable React hooks
│   │   │   ├── lib/             # API client, utility functions
│   │   │   ├── providers/       # Context and theme providers
│   │   │   ├── styles/          # Additional global styling
│   │   │   └── types/           # Frontend TypeScript types
│   │   ├── public/              # Static assets
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                     # Django REST Framework modular monolith
│       ├── config/              # Django core settings, routing, asgi/wsgi
│       │   ├── settings/
│       │   │   ├── base.py
│       │   │   ├── development.py
│       │   │   └── production.py
│       │   ├── urls.py          # Routing & health checks (liveness + readiness)
│       │   ├── asgi.py
│       │   └── wsgi.py
│       ├── modules/
│       │   └── accounts/        # Custom User model (UUID PK, normalized email, provisioning)
│       ├── common/              # Shared permissions, pagination, exceptions, utils
│       ├── tests/               # Test suites (health, user model, provisioning, db config)
│       ├── manage.py
│       └── pyproject.toml
│
├── packages/                    # Planned shared packages (api-contracts, shared-types, ui)
├── infrastructure/
│   ├── render/                  # Render Blueprint specifications (render.yaml)
│   ├── docker/                  # Container orchestration blueprints
│   └── scripts/                 # Operations and database scripts
├── docs/                        # Architecture decisions and technical specifications
├── .github/workflows/           # CI pipelines (GitHub Actions)
├── .env.example                 # Root environment template
├── .editorconfig                # Multi-language formatting guidelines
├── .gitignore                   # Monorepo git ignore rules
├── AGENTS.md                    # Instructions and boundaries for AI coding agents
└── package.json                 # Monorepo development scripts and npm workspace
```

---

## Local Setup Instructions

### Prerequisites
- Node.js `v22.x` and `npm`
- Python `3.12+` and `uv` (`curl -LsSf https://astral.sh/uv/install.sh | sh`)

### 1. Clone & Configure Environment
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 2. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies (managed via uv)
cd apps/api && uv sync && cd ../..
```

### 3. Run Migrations & Provision Owner (Local Dev)
```bash
cd apps/api
# Apply initial migrations (uses local SQLite by default or Supabase PostgreSQL if DATABASE_URL is set)
uv run python manage.py migrate

# Securely provision the initial owner account
uv run python manage.py provision_owner --username admin --email admin@example.com --superuser
```

---

## Development Commands

All key commands can be run from the repository root:

| Command | Action |
|---|---|
| `npm run dev:web` | Start the Next.js development server (port 3000) |
| `npm run dev:api` | Start the Django API development server (port 8000) |
| `npm run build:web` | Build the Next.js production bundle |
| `npm run lint` | Run both web ESLint and backend Ruff checks |
| `npm run lint:web` | Run Next.js ESLint |
| `npm run lint:api` | Run backend Ruff linter |
| `npm run format:api` | Format backend code using Ruff |
| `npm run test` | Run backend unit tests via manage.py test |
| `npm run test:api` | Run Django tests via manage.py |
