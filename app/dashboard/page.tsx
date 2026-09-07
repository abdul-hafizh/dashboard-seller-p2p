"use client";

import { Package, ShoppingCart, Layers, Printer, Building2, Building, Award } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useResourceCount } from "@/lib/hooks/useResourceCount";
import { Card, CardBody } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/resources/format";

const TIER_COLORS: Record<string, string> = {
  BRONZE: "#C77B4A",
  SILVER: "#9AA3AF",
  GOLD: "#E0AA23",
  PLATINUM: "#4FA8E0",
  SOLITAIRE: "#9B2FCE",
};

function AccountTierCard() {
  const { user } = useAuth();
  if (!user) return null;

  const level = user.UserLevel || "BRONZE";
  const color = TIER_COLORS[level] ?? TIER_COLORS.BRONZE;
  const tier = user.TierDetails;

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${color}1f` }}
          >
            <Award className="size-5" style={{ color }} />
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-soft">Tier Akun Saya</p>
            <p className="mt-0.5 text-lg font-extrabold text-ink">
              {level} <span className="font-semibold text-ink-soft">· Diskon {user.DiscountPercent ?? 0}%</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1 sm:min-w-64 sm:items-end">
          <p className="text-xs text-ink-soft">
            Total transaksi: <span className="font-semibold text-ink">{formatCurrency(user.TotalSpent ?? 0)}</span>
          </p>
          {tier?.nextTier ? (
            <>
              <div className="h-1.5 w-full max-w-64 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, tier.progressPercent))}%`, backgroundColor: color }}
                />
              </div>
              <p className="text-[11px] text-ink-soft">
                {formatCurrency(tier.remainingForNextTier)} lagi menuju {tier.nextTier}
              </p>
            </>
          ) : (
            <p className="text-[11px] font-semibold text-ink-soft">Tier tertinggi tercapai 🎉</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

interface StatDef {
  label: string;
  endpoint: string;
  icon: LucideIcon;
}

const STATS: StatDef[] = [
  { label: "Produk", endpoint: "products", icon: Package },
  { label: "Pesanan", endpoint: "orders", icon: ShoppingCart },
  { label: "Material", endpoint: "materials", icon: Layers },
  { label: "Printer", endpoint: "printers", icon: Printer },
  { label: "Perusahaan", endpoint: "companies", icon: Building2 },
  { label: "Cabang", endpoint: "branches", icon: Building },
];

function StatCard({ label, endpoint, icon: Icon }: StatDef) {
  const { count, isLoading } = useResourceCount(endpoint);
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className="brand-gradient flex size-11 shrink-0 items-center justify-center rounded-2xl">
          <Icon className="size-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold text-ink-soft">{label}</p>
          <p className="mt-0.5 text-2xl font-extrabold text-ink">
            {isLoading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-surface-muted" /> : count ?? "-"}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

export default function DashboardHomePage() {
  const { user, isAdmin } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Halo, {user?.FullName?.split(" ")[0] ?? "!"} 👋</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {isAdmin
            ? "Ringkasan seluruh data platform Snapy AI 3D."
            : "Ringkasan produk dan pesanan yang perlu kamu pantau."}
        </p>
      </div>

      <AccountTierCard />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {STATS.map((stat) => (
          <StatCard key={stat.endpoint} {...stat} />
        ))}
      </div>

      <Card>
        <CardBody>
          <p className="text-sm font-bold text-ink">Mulai dari sini</p>
          <p className="mt-1 text-sm text-ink-soft">
            Gunakan menu di samping untuk mengelola produk, memantau pesanan, dan mengatur data master
            seperti material, printer, dan metode pengiriman.
            {isAdmin && " Sebagai Super Admin, kamu juga bisa mengelola akun pengguna di menu Administrasi."}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
