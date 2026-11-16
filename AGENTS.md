# Agent Guidelines & Repository Conventions

This document defines the architectural boundaries, coding rules, and conventions for AI coding agents operating in this repository.

---

## 1. Monorepo Principles & Boundaries

- **Separation of Concerns**: Keep backend (`apps/api`) and frontend (`apps/web`) completely decoupled.
- **Backend Architecture**: Modular monolith pattern. Business logic lives in service functions/classes (`modules/<name>/services/`), queries in selectors (`modules/<name>/selectors/`), and HTTP controllers remain thin (`modules/<name>/views/`).
- **Frontend Architecture**: Feature-sliced organization (`src/features/<feature>/`). Keep UI components purely presentational where possible, lifting state into hooks or providers.
- **No Manual Duplication**: Do NOT manually duplicate Django models as TypeScript interfaces. API types will be generated from OpenAPI specifications in Phase 2+.
- **Shared Code**: Do not create speculative shared packages. Place code in `packages/` only when there is active reuse across two or more applications.

---

## 2. Dependencies & Tooling

- **Python Management**: Always use `uv` for managing dependencies and running Python scripts inside `apps/api`. Do NOT use `pip` or modify `.venv` directly.
- **Frontend Management**: Use `npm` for frontend packages inside `apps/web`.
- **Minimal Dependencies**: Do not introduce new third-party libraries, state-management frameworks (e.g., Redux, Zustand), ORM layers, or styling libraries without explicit requirement and rationale.
- **No Premature Infrastructure**: Do not introduce message queues, Redis, Celery, vector databases, or AI orchestration SDKs until explicitly tasked in future milestones.

---

## 3. Code Quality & Formatting Rules

- **Backend (Python)**:
  - Formatted and linted strictly via **Ruff** (`uv run ruff check .` and `uv run ruff format .`).
  - Target Python version: 3.12+.
  - All public views, services, and models must include concise docstrings and type annotations.
- **Frontend (TypeScript)**:
  - Strict TypeScript checking (`tsc --noEmit` must pass cleanly).
  - ESLint rules must pass without errors or warnings.
  - Follow Next.js App Router idioms (Server Components by default, `'use client'` only when client-side interactivity is required).

---

## 4. Verification Requirements

Before submitting or reporting any task completed:
1. Run backend tests: `cd apps/api && uv run python manage.py test`.
2. Run backend checks: `cd apps/api && uv run python manage.py check`.
3. Run backend linting & formatting checks: `cd apps/api && uv run ruff check . && uv run ruff format --check .`.
4. Run frontend lint & build checks: `cd apps/web && npm run lint && npm run build`.
5. Ensure no environment variables or credentials have leaked into git-tracked files.
6. Verify root-level scripts in `package.json` execute properly.

Never claim verification passed without executing the commands and inspecting their exit codes.
