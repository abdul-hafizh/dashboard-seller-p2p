export interface Pagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type QueryValue = string | number | boolean | undefined | null;

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  json?: unknown;
  formData?: FormData;
  query?: Record<string, QueryValue>;
}

function buildQuery(query?: Record<string, QueryValue>) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Client-side fetch wrapper — always talks to our own `/api/backend/*` proxy,
 * never to the Express API directly, so the JWT never touches client JS. */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiEnvelope<T>> {
  const { method = "GET", json, formData, query } = options;

  const init: RequestInit = { method };
  if (formData) {
    init.body = formData;
  } else if (json !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(json);
  }

  const res = await fetch(`/api/backend/${path.replace(/^\//, "")}${buildQuery(query)}`, init);

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = await res.json();
  } catch {
    // non-JSON response body
  }

  if (!res.ok || !payload?.success) {
    if (res.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
      // Hard navigation (not router.push) is intentional here: this runs outside React
      // components, e.g. inside SWR fetchers, and a full reload also clears any stale
      // client state left over from the expired session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
    throw new ApiError(payload?.message || `Permintaan gagal (${res.status})`, res.status);
  }

  return payload;
}
