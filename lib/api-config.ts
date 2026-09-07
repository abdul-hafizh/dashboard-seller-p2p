/** Server-only: the Express API origin. Never expose this to the client bundle —
 * client code always talks to our own `/api/backend/*` proxy instead.
 *
 * The actual value used for API traffic is resolved dynamically from
 * api-meshy's own `GET /system/base-url` (backed by the SystemSettings
 * table, editable from this dashboard's own /dashboard/system-settings page)
 * so a backend domain change only requires updating that DB row — no env
 * var edit or redeploy here.
 *
 * The *lookup itself* always queries BOOTSTRAP_API_URL (the env var), never
 * the last-resolved value — chaining lookups through a moving target means
 * one bad row (e.g. accidentally pointing back at this very dashboard, which
 * happened once already: it turned an ordinary settings typo into every
 * proxied request 404ing against itself, and /api/auth/login recursively
 * calling itself into a hang) becomes permanently self-reinforcing with no
 * way to fix it short of editing the DB directly. Anchoring the lookup to a
 * fixed, known-reachable host means a bad value only ever breaks the *data*
 * calls that use it — the lookup, and thus recovery, keeps working. */
const BOOTSTRAP_API_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

const CACHE_TTL_MS = 60_000;

interface BaseUrlCache {
  url: string;
  fetchedAt: number;
}

// Module-level — persists for the life of this server process, shared across
// requests. Each Next.js server process keeps its own copy; that's fine,
// they'll all converge within one CACHE_TTL_MS window.
let cache: BaseUrlCache = { url: BOOTSTRAP_API_URL, fetchedAt: 0 };

/** Current API origin — cached for CACHE_TTL_MS, then re-resolved from the
 * SystemSettings row (always looked up via BOOTSTRAP_API_URL, see above). */
export async function getApiBaseUrl(): Promise<string> {
  const now = Date.now();
  if (now - cache.fetchedAt < CACHE_TTL_MS) return cache.url;

  try {
    const res = await fetch(`${BOOTSTRAP_API_URL}/api/system/base-url`, { cache: "no-store" });
    const payload = await res.json().catch(() => null);
    const baseUrl = payload?.data?.baseUrl;
    if (res.ok && typeof baseUrl === "string" && /^https?:\/\//i.test(baseUrl)) {
      cache = { url: baseUrl, fetchedAt: now };
      return baseUrl;
    }
  } catch {
    // Lookup unreachable — fall through to the bootstrap URL below.
  }

  cache = { url: BOOTSTRAP_API_URL, fetchedAt: now };
  return BOOTSTRAP_API_URL;
}
