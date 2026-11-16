/**
 * Authentication API services.
 */

import { apiClient } from "@/lib/api-client";
import type {
  AuthUser,
  CsrfResponse,
  LoginCredentials,
  LogoutResponse,
} from "../types";

export const authService = {
  /**
   * Initialize CSRF cookie and obtain csrf token.
   */
  async initCsrf(): Promise<CsrfResponse> {
    return apiClient<CsrfResponse>("/api/v1/auth/csrf/", {
      method: "GET",
    });
  },

  /**
   * Authenticate owner and establish session.
   */
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    // Ensure CSRF cookie is initialized before submitting login
    await this.initCsrf();

    return apiClient<AuthUser>("/api/v1/auth/login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Invalidate session and logout.
   */
  async logout(): Promise<LogoutResponse> {
    return apiClient<LogoutResponse>("/api/v1/auth/logout/", {
      method: "POST",
    });
  },

  /**
   * Fetch current authenticated user.
   */
  async getMe(): Promise<AuthUser> {
    return apiClient<AuthUser>("/api/v1/auth/me/", {
      method: "GET",
    });
  },
};
