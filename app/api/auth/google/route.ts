import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api-config";
import { respondWithSession } from "@/lib/auth-response";

/** Shared by both the login and register pages — Google doesn't distinguish
 * "sign up" from "sign in", so both send the ID token here. When
 * `registerAsMerchant` is set and the email doesn't match an existing user,
 * the backend creates a Merchant account instead of the default Customer one
 * (see AuthService.googleLogin in api-meshy — it resolves the role by name
 * server-side, so this flag can't be abused to grant anything beyond that).
 * An email that already belongs to a Customer account still gets rejected by
 * respondWithSession below, same as password login. */
export async function POST(request: NextRequest) {
  let body: { idToken?: string; registerAsMerchant?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Permintaan tidak valid." }, { status: 400 });
  }

  if (!body.idToken) {
    return NextResponse.json({ success: false, message: "Token Google tidak ditemukan." }, { status: 400 });
  }

  const upstream = await fetch(`${await getApiBaseUrl()}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken: body.idToken,
      registerAsMerchant: body.registerAsMerchant === true,
    }),
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
      { success: false, message: payload?.message || "Masuk dengan Google gagal." },
      { status: upstream.status || 400 },
    );
  }

  return respondWithSession(payload);
}
