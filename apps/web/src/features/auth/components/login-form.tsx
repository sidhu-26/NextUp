"use client";

/**
 * LoginForm component with accessible controls, validation, and loading states.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/use-auth";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      errors.username = "Username or email is required.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login({
        username: username.trim(),
        password,
      });
      // Clear password from local state immediately after submission
      setPassword("");
      router.push("/dashboard");
    } catch (err) {
      // Clear password field on error for security
      setPassword("");
      const message =
        err instanceof Error ? err.message : "Invalid credentials provided.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Sign in to NextUP
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Owner Portal Authentication
        </p>
      </div>

      {formError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 mb-4 text-sm text-red-700 bg-red-100 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg"
        >
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Username or Email
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isSubmitting}
            aria-describedby={
              fieldErrors.username ? "username-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.username)}
            className="w-full px-3 py-2 border rounded-lg text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {fieldErrors.username && (
            <p id="username-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {fieldErrors.username}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.password)}
            className="w-full px-3 py-2 border rounded-lg text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {fieldErrors.password && (
            <p id="password-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? "Authenticating..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
