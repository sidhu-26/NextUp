/**
 * API client configuration and base fetch wrapper.
 * Defaults to same-origin relative URLs (/api/...) so Next.js rewrites
 * route requests seamlessly while cookies and CSRF are scoped locally.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Access and refresh token storage in localStorage.
 */
    const ACCESS_TOKEN_KEY = "nextup_access_token";
    const REFRESH_TOKEN_KEY = "nextup_refresh_token";

    export function getStoredAccessToken(): string | null {
      if (typeof window === "undefined") return null;
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }

    export function getStoredRefreshToken(): string | null {
      if (typeof window === "undefined") return null;
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }

    export function setStoredTokens(access: string, refresh?: string): void {
      if (typeof window === "undefined") return;
      localStorage.setItem(ACCESS_TOKEN_KEY, access);
      if (refresh) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
      }
    }

    export function clearStoredTokens(): void {
      if (typeof window === "undefined") return;
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }

    export class ApiError extends Error {
      status: number;
      data: unknown;

      constructor(status: number, message: string, data?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
      }
    }

    let isRefreshing = false;
    let refreshSubscribers: ((token: string) => void)[] = [];

    function onRefreshed(token: string) {
      refreshSubscribers.forEach((callback) => callback(token));
      refreshSubscribers = [];
    }

    async function refreshAccessToken(): Promise<string | null> {
      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) return null;

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (!res.ok) {
          clearStoredTokens();
          return null;
        }

        const data = await res.json();
        if (data.access) {
          setStoredTokens(data.access, data.refresh);
          return data.access as string;
        }
        return null;
      } catch {
        clearStoredTokens();
        return null;
      }
    }

    export async function apiClient<T>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<T> {
      const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      const url = `${API_BASE_URL}${normalizedEndpoint}`;

      const defaultHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };

        const accessToken = getStoredAccessToken();
        if (accessToken) {
          defaultHeaders["Authorization"] = `Bearer ${accessToken}`;
        }

        const response = await fetch(url, {
          ...options,
          headers: {
            ...defaultHeaders,
            ...options.headers,
          },
          credentials: "include",
        });

        // Handle automatic 401 token refresh if an access token was present
        if (response.status === 401 && accessToken && !endpoint.includes("/api/v1/auth/")) {
          if (!isRefreshing) {
            isRefreshing = true;
            const newToken = await refreshAccessToken();
            isRefreshing = false;
            if (newToken) {
              onRefreshed(newToken);
              // Retry initial request
              return apiClient<T>(endpoint, {
                ...options,
                headers: {
                  ...options.headers,
                  Authorization: `Bearer ${newToken}`,
                },
              });
            }
          } else {
            // Wait for the active refresh to finish
            return new Promise<T>((resolve) => {
              refreshSubscribers.push((newToken: string) => {
                resolve(
                  apiClient<T>(endpoint, {
                    ...options,
                    headers: {
                      ...options.headers,
                      Authorization: `Bearer ${newToken}`,
                    },
                  })
                );
              });
            });
          }
        }

        if (!response.ok) {
          let errorData: unknown;
          let errorMessage = `API error: ${response.status} ${response.statusText}`;

          try {
            errorData = await response.json();
            if (
              errorData &&
              typeof errorData === "object" &&
              "detail" in errorData &&
              typeof (errorData as { detail: unknown }).detail === "string"
            ) {
              errorMessage = (errorData as { detail: string }).detail;
            }
          } catch {
            // Non-JSON response or empty body
          }

          throw new ApiError(response.status, errorMessage, errorData);
        }

        if (response.status === 204) {
          return {} as T;
        }

        return response.json() as Promise<T>;
      }
