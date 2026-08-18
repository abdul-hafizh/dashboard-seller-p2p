/** Server-only: the Express API origin. Never expose this to the client bundle —
 * client code always talks to our own `/api/backend/*` proxy instead. */
export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
