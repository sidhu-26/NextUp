/**
 * Authentication API services.
 */

import {
  apiClient,
  clearStoredTokens,
  setStoredTokens,
} from "@/lib/api-client";
import type {
  AuthUser,
  LoginCredentials,
  LoginResponse,
  LogoutResponse,
} from "../types";

export const authService = {
  /**
   * Authenticate owner with email/username and password.
   * Returns JWT access/refresh tokens and stores them in localStorage.
   */
  async login(credentials: LoginCredentials): Promise<AuthUser> {
      const res = await apiClient<LoginResponse>("/api/v1/auth/login/", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      if(res.access) {
      setStoredTokens(res.access, res.refresh);
    }

    return res;
  },

  /**
   * Invalidate tokens and logout.
   */
  async logout(): Promise<LogoutResponse> {
    clearStoredTokens();
    try {
      return await apiClient<LogoutResponse>("/api/v1/auth/logout/", {
        method: "POST",
      });
    } catch {
      return { detail: "Logged out" };
    }
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
