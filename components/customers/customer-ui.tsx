"use client";

import { toPublicAssetUrl } from "@/lib/resources/format";

export interface CustomerRow {
  Id: string;
  FullName: string | null;
  Email: string | null;
  Phone: string | null;
  WhatsappNumber: string | null;
  Gender: "MALE" | "FEMALE" | null;
  BirthDate: string | null;
  Avatar: string | null;
  UserLevel: string | null;
  IsActive: boolean | null;
  CreatedAt: string | null;
  Stats: { Orders: number; PaidOrders: number; Spent: number; LastOrderAt: string | null };
  DefaultAddress: { City: string | null; HasPin: boolean } | null;
}

export const genderLabel = (g: string | null | undefined) => (g === "MALE" ? "Laki-laki" : g === "FEMALE" ? "Perempuan" : "-");

export function ageOf(birthDate: string | null | undefined) {
  if (!birthDate) return null;
  const d = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

export function CustomerAvatar({ src, name, size = 36 }: { src: string | null | undefined; name: string | null | undefined; size?: number }) {
  const url = src ? (/^https?:\/\//i.test(src) ? src : toPublicAssetUrl(src)) : null;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- uploaded/Google avatar, not worth Next/Image remote config
    <img src={url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-purple/10 text-xs font-bold text-brand-purple"
    >
      {(name ?? "?").trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}
