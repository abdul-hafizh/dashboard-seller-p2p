import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";

/** Public static files of the Express API (e.g. `/uploads/xxx.jpg`), served
 * through this dashboard's own origin. The API origin is resolved at runtime
 * (same as `/api/backend/*`), so images follow the active domain instead of
 * whatever NEXT_PUBLIC_* value was baked in at build time. */
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.some((p) => p === ".." || p === "." || p.includes("\\"))) {
    return new NextResponse(null, { status: 400 });
  }

  const target = new URL(`${await getApiBaseUrl()}/${path.map(encodeURIComponent).join("/")}`);
  target.search = request.nextUrl.search;

  const upstream = await fetch(target, { cache: "no-store" }).catch(() => null);
  if (!upstream) return new NextResponse(null, { status: 502 });
  if (!upstream.ok || !upstream.body) return new NextResponse(null, { status: upstream.status });

  const headers: Record<string, string> = {
    "Cache-Control": upstream.headers.get("cache-control") ?? "public, max-age=86400",
  };
  for (const name of ["content-type", "content-length", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers[name] = value;
  }
  return new NextResponse(upstream.body, { status: 200, headers });
}
