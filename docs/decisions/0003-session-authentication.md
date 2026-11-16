# ADR 0003: Session-Based Authentication & Owner Security Architecture

- **Status**: Accepted
- **Date**: 2026-11-16
- **Context**: Establishing secure user authentication, session lifecycle, CSRF protection, and single-owner access controls for NextUP.

---

## 1. Context & Problem Statement

NextUP requires a secure, production-grade authentication foundation. Key requirements and trade-offs:
1. **Authentication Mechanism**: Session-based cookies vs. stateless JWT vs. third-party identity (Supabase Auth / OAuth).
2. **Same-Origin vs. Cross-Origin Routing**: Handling third-party cookie restrictions in modern web browsers (Safari ITP, Chrome Partitioned Cookies).
3. **Single-User Access Guardrails**: Ensuring only the provisioned owner can authenticate while preventing public registration or unauthorized access by any secondary account.
4. **CSRF & Session Security**: Full protection across all state-changing endpoints without weakening security for convenience.

---

## 2. Decisions

### A. Django Server-Side Session Authentication
- **Choice**: Django's built-in session framework backed by PostgreSQL (`django.contrib.sessions.backends.db`).
- **Rationale**:
  - Secure `HttpOnly`, `SameSite=Lax`, and `Secure` cookies prevent token exfiltration via client-side XSS.
  - Revocation is instant upon logout (`request.session.flush()`), unlike stateless JWTs which require complex denylists.
  - Aligns with Django's native security framework without adding external infrastructure (e.g. Redis, OAuth brokers).

### B. Same-Origin Architecture via Next.js Rewrites
- **Choice**: Route `/api/*` browser requests through Next.js server rewrites to the Django backend.
- **Rationale**:
  - Eliminates cross-origin cookie blocking across different `onrender.com` subdomains.
  - Browser treats all requests as same-origin (`window.location.origin`), preserving cookie persistence and CSRF token transmission automatically.
  - Production deployments can either use these Next.js rewrites or a shared custom apex domain (e.g., `*.planner.domain.com` with `SESSION_COOKIE_DOMAIN`).

### C. Universal CSRF Protection
- **Choice**: Enforce CSRF checking across all state-changing endpoints, including login and logout (`EnforcedSessionAuthentication`).
- `GET /api/v1/auth/csrf/`: Explicit CSRF initialization endpoint returning `csrftoken` and setting the cookie.
- Dynamic CSRF extraction via `api-client.ts` populates `X-CSRFToken` automatically for all unsafe requests (`POST`, `PUT`, `PATCH`, `DELETE`).
- Session rotation on successful login (`django.contrib.auth.login`) cycles the session identifier, mitigating session fixation attacks.

### D. Single-Owner Identity Verification
- **Choice**: Explicit `OWNER_USERNAME` / `OWNER_EMAIL` settings configuration.
- Validates that the authenticating user matches the configured owner identity.
- In production (`config/settings/production.py`), the application fails closed at startup if owner configuration is absent.
- Non-owner accounts and disabled accounts are rejected with uniform 401 error responses to prevent user enumeration.

---

## 3. Future Architectural Roadmap

- **Multi-User Transition**: Can be introduced later by decoupling `is_owner_user` checks into role-based access control (RBAC) models.
- **Mobile Clients (Expo / React Native)**: Mobile apps will interface using either custom header session tokens or dedicated API tokens, avoiding browser cookie dependencies.
- **Multi-Factor Authentication (MFA)**: Recommended before storing sensitive financial, personal, or automated calendar credentials.

---

## 4. Consequences

- **Positives**:
  - Zero token leakage to browser storage (`localStorage` / `sessionStorage`).
  - Strict CSRF protection and brute-force rate limiting out-of-the-box.
  - Seamless Next.js App Router integration with in-memory auth state.
- **Negatives**:
  - Server-side database writes required for session persistence.
