# Planned Shared Packages

This directory is designated for reusable packages across applications.

## Planned Packages

- **`api-contracts/`**: Future generated TypeScript API definitions from the Django OpenAPI schema (e.g. via `openapi-ts` / `drf-spectacular`). This avoids manually duplicating Django model schemas into TypeScript interfaces.
- **`shared-types/`**: Shared domain primitives and types useful across web and future mobile applications (React Native / Expo).
- **`ui/`**: Headless or shared web UI components. Note: Kept separate from mobile UI primitives to avoid coupling web HTML/DOM components with React Native components.

*Note: In Phase 1, these packages are purposefully deferred to keep the build pipeline lean and avoid premature abstraction until OpenAPI schema generation is introduced.*
