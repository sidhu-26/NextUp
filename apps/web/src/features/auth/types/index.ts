/**
 * Authentication domain types.
 */

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  is_authenticated: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface CsrfResponse {
  detail: string;
  csrf_token: string;
}

export interface LogoutResponse {
  detail: string;
}
