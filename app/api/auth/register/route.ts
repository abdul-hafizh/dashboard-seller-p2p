import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api-config";
import { ROLE } from "@/lib/constants";

/** Only merchants may self-register from this dashboard — RoleId is forced
 * server-side so nothing client-supplied can override it. */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Permintaan tidak valid." }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, RoleId: ROLE.MERCHANT }),
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
      { success: false, message: payload?.message || "Registrasi gagal." },
      { status: upstream.status || 400 },
    );
  }

  return NextResponse.json(payload);
}
