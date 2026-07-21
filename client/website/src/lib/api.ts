/*
  Thin, read-only fetch client for the public website API.

  Same-origin in production (served from ac.spisg.gov.bd alongside /api). In dev,
  Vite proxies /api to the local Django backend, so the default base "/api" works
  everywhere. A build-time VITE_API_BASE_URL can override it (deploy.sh passes the
  full origin, matching the student/admin apps).
*/
const BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const qs = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  const res = await fetch(`${BASE}/website${path}${qs}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/** Unwrap either a paginated envelope or a bare array into a plain list. */
export function asList<T>(data: Paginated<T> | T[] | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : data.results;
}
