# Authentication & Session Security Architecture

This document describes the design, implementation, and operational procedures for NextUP's authentication system.

---

## 1. Architecture Overview

NextUP uses Django's server-side session authentication with HTTP-only cookies, combined with a same-origin Next.js App Router frontend.

```
┌─────────────────────────────────┐
│     Next.js Web (Frontend)      │
│  - In-memory AuthProvider       │
│  - Login Form (/login)          │
│  - Protected Route (/dashboard) │
└───────────────┬─────────────────┘
                │ Same-origin /api/* requests
                ▼
┌─────────────────────────────────┐
│       Next.js Rewrites /        │
│          Reverse Proxy          │
└───────────────┬─────────────────┘
                │ Proxied HTTP requests with cookies
                ▼
┌─────────────────────────────────┐
│  Django REST Framework Backend  │
│  - CSRF Initialization (/csrf/) │
│  - Rate Limiting (5 req/min)    │
│  - Owner Verification Service   │
│  - Session Invalidation (/logout)│
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  Supabase PostgreSQL (Database) │
│  - django_session table         │
│  - accounts_user (UUID PK)      │
└─────────────────────────────────┘
```

---

## 2. API Endpoints

All endpoints are versioned under `/api/v1/auth/`:

| Method | Endpoint | Auth Required | CSRF Enforced | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/auth/csrf/` | No | No | Initializes CSRF token and cookie |
| `POST` | `/api/v1/auth/login/` | No (Rate-limited) | **Yes** | Validates credentials, rotates session, logs in owner |
| `POST` | `/api/v1/auth/logout/` | No | **Yes** | Terminates session, clears session cookies |
| `GET` | `/api/v1/auth/me/` | **Yes (401 if unauth)** | No | Returns minimal current user profile |

### Response Schema for `/api/v1/auth/me/`

```json
{
  "id": "e0b1f3c2-1234-5678-90ab-cdef12345678",
  "username": "admin",
  "email": "owner@example.com",
  "is_authenticated": true
}
```

---

## 3. Security Controls

### CSRF Protection
- Universal CSRF validation is enforced on all state-changing endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) via `EnforcedSessionAuthentication`.
- Client `api-client.ts` automatically extracts `csrftoken` from `document.cookie` and transmits it in the `X-CSRFToken` request header.

### Session Lifecycle & Fixation Mitigation
- `SESSION_COOKIE_HTTPONLY = True`: Blocks JavaScript access to the session cookie.
- `SESSION_COOKIE_SECURE = True`: Enforced in production to guarantee HTTPS-only transmission.
- `SESSION_COOKIE_SAMESITE = "Lax"`: Provides defense against cross-site request forgery.
- `SESSION_SAVE_EVERY_REQUEST = True`: Preserves rolling session validity.
- Session Rotation: `django.contrib.auth.login` calls `request.session.cycle_key()`, cycling the session ID upon authentication to prevent session fixation.
- Immediate Revocation: `logout()` calls `request.session.flush()`, immediately destroying the session in the database.

### Owner Identity Verification
- Authenticated accounts are cross-checked against `OWNER_USERNAME` / `OWNER_EMAIL`.
- In production (`config/settings/production.py`), missing owner configurations cause an immediate startup failure (`ImproperlyConfigured`), failing closed.
- Non-owner and disabled accounts receive generic 401 Unauthorized responses to prevent user enumeration.

### Rate Limiting
- `LoginRateThrottle` limits anonymous login attempts by IP to **5 requests per minute**, preventing brute-force password guessing.

---

## 4. Frontend Integration

- **In-Memory State**: User profile is maintained in `AuthProvider` React state. Passwords and session keys are never saved to `localStorage` or `sessionStorage`.
- **Client Form Validation**: Accessible inputs with ARIA attributes (`aria-invalid`, `aria-describedby`) and live error announcements.
- **Protected Routes**: `<ProtectedRoute>` client wrapper gates sensitive views, redirecting unauthenticated users to `/login`.

---

## 5. Deployment & Routing (Render)

### Same-Origin Architecture
To prevent third-party cookie blocking between separate subdomains on Render (`*.onrender.com`), Next.js rewrites route all `/api/*` requests internally to the Django web service:

```typescript
// apps/web/next.config.ts
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: `${process.env.INTERNAL_API_URL || "http://127.0.0.1:8000"}/api/:path*`,
    },
  ];
}
```

### Production Environment Variables

#### Backend (`apps/api`):
- `DJANGO_SECRET_KEY`: High-entropy production key.
- `DJANGO_SETTINGS_MODULE`: `config.settings.production`
- `DJANGO_ALLOWED_HOSTS`: API domain or internal service host.
- `DATABASE_URL`: Supabase PostgreSQL session pooler connection string with TLS.
- `OWNER_USERNAME`: Configured owner username.
- `OWNER_EMAIL`: Configured owner email.
- `CORS_ALLOWED_ORIGINS`: Web client origin.
- `CSRF_TRUSTED_ORIGINS`: Web client origin.

#### Frontend (`apps/web`):
- `INTERNAL_API_URL`: URL to backend service (e.g. `http://personal-planner-api:10000`).

---

## 6. Future Roadmap

1. **Multi-Factor Authentication (MFA)**: Highly recommended before storing sensitive personal or calendar credentials.
2. **Mobile Clients (Expo / React Native)**: Will interface via custom authorization headers or dedicated API tokens rather than browser cookie sessions.
