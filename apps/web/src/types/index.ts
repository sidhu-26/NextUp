/**
 * Common shared types for web application.
 */

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
}
