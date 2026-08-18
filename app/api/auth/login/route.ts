import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api-config";
import { respondWithSession } from "@/lib/auth-response";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Permintaan tidak valid." }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!upstream) {
    return NextResponse.json(
      { success: false, message: "Tidak dapat terhubung ke server." },
      { status: 502 },
    );
  }

  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok || !payload?.success) {
    return NextResponse.json(
      { success: false, message: payload?.message || "Email atau password salah." },
      { status: upstream.status || 400 },
    );
  }

  return respondWithSession(payload);
}
