/**
 * API client configuration and base fetch wrapper.
 * Defaults to same-origin relative URLs (/api/...) so Next.js rewrites
 * route requests seamlessly while cookies and CSRF are scoped locally.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Extract CSRF token from document.cookie (csrftoken).
 */
export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
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

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Automatically attach CSRF token for unsafe HTTP methods if available
  const method = (options.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      defaultHeaders["X-CSRFToken"] = csrfToken;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: "include", // Required for session cookie authentication
  });

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

  // Handle HTTP 204 or empty responses gracefully
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
