# ADR 0001: Monorepo Architecture and Technology Stack

- **Status**: Accepted
- **Date**: 2026-11-16
- **Context**: Design and structure of the Personal Planner codebase to support immediate single-user web execution while enabling evolution into an AI-powered assistant with multi-platform support (web, mobile, background agents).

---

## Decision

We adopt a **modular monorepo** layout containing decoupled backend (`apps/api`) and frontend (`apps/web`) applications with a shared packages root (`packages/`):

1. **Backend**: Python 3.12+ with Django and Django REST Framework organized as a modular monolith.
   - Package manager: `uv` for fast, deterministic dependency management.
   - Linting & formatting: `Ruff`.
   - ORM: Django ORM connecting to external Supabase PostgreSQL.
2. **Frontend**: Next.js App Router with TypeScript and Tailwind CSS organized around feature slices.
   - Package manager: `npm` with npm workspaces for JavaScript packages.
3. **Shared Packages**: Planned reserved directory (`packages/`) for generated API contracts and domain types. No manual duplication of backend models in frontend code.
4. **Deployment**: Render web services configuration using Render Blueprints (`infrastructure/render/render.yaml`).
5. **CI/CD**: GitHub Actions matrix for backend (lint, format, test, manage.py check) and frontend (lint, build).

---

## Alternatives Considered

### 1. Separate Multi-Repo Architecture
- *Pros*: Completely independent versioning and permissions.
- *Cons*: High synchronization friction, disparate pull requests, duplicated documentation, and complicated contract generation across repos.
- *Reason for Rejection*: A single developer needs atomic commits, unified issue tracking, and frictionless cross-application coordination.

### 2. Microservices Architecture
- *Pros*: Independent scalability of individual domain boundaries.
- *Cons*: Extreme operational complexity, network latency, distributed transactions, and overhead inappropriate for initial phases.
- *Reason for Rejection*: A modular monolith provides clean domain separation without distributed system operational penalties.

### 3. Integrated Fullstack Framework (e.g. Next.js API Routes only)
- *Pros*: Single runtime (Node.js/TypeScript).
- *Cons*: Python is the industry-standard runtime for advanced AI agent orchestration (LangGraph, PyTorch, LangChain, scientific libraries), background processing (Celery), and robust relational ORM capabilities.
- *Reason for Rejection*: Django backend establishes a foundational base for future Python AI agent workflows.

---

## Consequences & Tradeoffs

- **Positives**:
  - Clear separation between Python backend ecosystem and Node.js frontend ecosystem.
  - Zero coupling between HTTP controllers and business services, facilitating direct Python AI agent access.
  - Rapid, reliable local development with modern tooling (`uv`, Turbopack).
- **Negatives / Mitigation**:
  - Managing two distinct package managers (`uv` and `npm`). Mitigated via root-level scripts in `package.json` that orchestrate both environments.
