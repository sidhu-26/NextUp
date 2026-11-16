# Architecture Overview

## 1. System Vision & Architecture

NextUp is architected as a **modular monolith** with decoupled frontend clients and an extensible backend capable of evolving from a single-user personal planner to an AI-orchestrated productivity assistant.

```
┌────────────────────────────────────────────────────────┐
│                       Clients                          │
│                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │   Next.js App (Web)     │  │ Future Mobile App   │  │
│  │   (apps/web)            │  │ (React Native/Expo) │  │
│  └────────────┬────────────┘  └──────────┬──────────┘  │
└───────────────┼──────────────────────────┼─────────────┘
                │ HTTP / REST              │ HTTP / REST
                ▼                          ▼
┌────────────────────────────────────────────────────────┐
│                apps/api (Modular Monolith)             │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Django REST Framework API Layer                  │  │
│  │ - Session Auth (Secure HTTP-only cookies)        │  │
│  │ - Liveness & Readiness Probes                    │  │
│  └──────────────────────────┬───────────────────────┘  │
│                             ▼                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Domain Service Layer (modules/*)                 │  │
│  │ - Accounts (Custom User, UUID PK, Normalization) │  │
│  │ - Tasks        - Projects       - Calendar       │  │
│  │ - Scheduling   - Activity                        │  │
│  └──────┬───────────────────┬───────────────────────┘  │
│         │                   │                          │
│         ▼                   ▼                          │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │ Django ORM   │    │ Future AI Layer / Celery     │  │
│  └──────┬───────┘    │ (LangGraph Agents / Workers) │  │
│         │            └──────────────────────────────┘  │
└─────────┼──────────────────────────────────────────────┘
          ▼
┌────────────────────────────────────────────────────────┐
│                External Infrastructure                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Supabase PostgreSQL (Session Pooler Port 5432)   │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Organization

- **`apps/api`**: Modular monolithic Django API. Contains domain modules, common infrastructure (permissions, pagination, exceptions), and environment-specific settings.
- **`apps/web`**: Next.js (App Router) web client using TypeScript and Tailwind CSS.
- **`packages/`**: Monorepo shared packages reserved for code reused across multiple apps (such as future OpenAPI-generated TypeScript client contracts and shared types).
- **`infrastructure/`**: Render Blueprints (`render.yaml`), Docker container setups, and operational scripts.
- **`docs/`**: Central knowledge base containing system blueprints, ADRs, and API references.

---

## 3. Backend & Frontend Boundaries

- **Database Authority**: Supabase is strictly an external PostgreSQL provider. The Django ORM owns the schema and all migrations. No client-side database access exists.
- **Authentication Boundary**: Authentication uses standard Django session authentication over secure, HTTP-only cookies for web interactions, preventing credential exposure to client-side scripts. CSRF protection is strictly enforced across all state-changing endpoints, and owner identity is explicitly restricted. Next.js server rewrites provide a unified same-origin boundary.
- **Business Logic Boundary**: Views handle request parsing and response rendering only. All business operations are encapsulated in `services/` and data access queries in `selectors/`.
- **Contracts**: The API schema will serve as the single source of truth. Future TypeScript types will be automatically generated from Django REST Framework OpenAPI specifications rather than manually duplicated.

---

## 4. Future Mobile & AI Integration Strategy

### Mobile Integration (React Native / Expo)
- The backend API is designed as a standalone headless service. When adding a mobile app, it will consume the exact same DRF endpoints via token or session authentication.
- Shared domain types will live in `packages/shared-types`, while UI primitives will remain separate to prevent web HTML and mobile React Native view mismatches.

### AI & Background Processing
- Domain services are decoupled from HTTP request handling. Future background workers (Celery/Redis) and AI agent tool invocations (LangGraph) can invoke domain services directly as standard Python functions with no HTTP overhead.
