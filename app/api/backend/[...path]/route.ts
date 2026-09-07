import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";
import { getSessionToken, clearSessionCookie } from "@/lib/session";

/** Generic authenticated proxy: every resource (materials, products, orders, ...)
 * goes through this single handler instead of one route file each. The JWT lives
 * only in the httpOnly cookie and is attached here — client JS never sees it. */
async function proxy(request: NextRequest, path: string[]) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Sesi berakhir, silakan masuk kembali." },
      { status: 401 },
    );
  }

  const targetUrl = new URL(`${await getApiBaseUrl()}/api/${path.join("/")}`);
  targetUrl.search = request.nextUrl.search;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const method = request.method;
  let body: BodyInit | undefined;

  if (method !== "GET" && method !== "HEAD") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      body = await request.formData();
    } else {
      headers["Content-Type"] = "application/json";
      body = await request.text();
    }
  }

  const upstream = await fetch(targetUrl, { method, headers, body }).catch(() => null);
  if (!upstream) {
    return NextResponse.json(
      { success: false, message: "Tidak dapat terhubung ke server." },
      { status: 502 },
    );
  }

  if (upstream.status === 401) {
    await clearSessionCookie();
  }

  const responseContentType = upstream.headers.get("content-type") ?? "";
  if (responseContentType.includes("application/json")) {
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data, { status: upstream.status });
  }

  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    status: upstream.status,
    headers: responseContentType ? { "Content-Type": responseContentType } : undefined,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}
export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}
export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}
export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}
export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, (await context.params).path);
}
