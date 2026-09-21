import { NextResponse } from "next/server";
import { setSessionCookie } from "./session";
import { DASHBOARD_ROLE_IDS } from "./constants";
import { siteConfig } from "./site-config";

interface UpstreamAuthPayload {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    user?: { RoleId?: number };
  };
}

/** Shared by every auth route (password login, Google login): only Super Admin
 * and Merchant accounts get a session here — everything else (Customer, or a
 * malformed payload) is rejected without setting a cookie. */
export async function respondWithSession(payload: UpstreamAuthPayload) {
  const roleId = payload.data?.user?.RoleId;
  const token = payload.data?.token;

  if (!token || !roleId || !DASHBOARD_ROLE_IDS.includes(roleId)) {
    return NextResponse.json(
      {
        success: false,
        message:
          `Akun ini tidak memiliki akses ke dashboard. Gunakan aplikasi ${siteConfig.appName} untuk masuk sebagai pelanggan.`,
      },
      { status: 403 },
    );
  }

  await setSessionCookie(token);
  return NextResponse.json({ success: true, message: payload.message, data: payload.data });
}
