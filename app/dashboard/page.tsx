"use client";

import { Package, ShoppingCart, Printer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { siteConfig } from "@/lib/site-config";
import { useResourceCount } from "@/lib/hooks/useResourceCount";
import { Card, CardBody } from "@/components/ui/Card";
import { useState } from "react";
import { ALL_TIME, PeriodFilter, periodQuery, type Period } from "@/components/ui/PeriodFilter";
import { PromoParticipationCard } from "@/components/promotions/PromoParticipationCard";

interface StatDef {
  label: string;
  endpoint: string;
  icon: LucideIcon;
  /** Counted within the chosen period (transaction data); otherwise all-time. */
  periodic?: boolean;
}

const STATS: StatDef[] = [
  { label: "Produk", endpoint: "products", icon: Package, periodic: true },
  { label: "Pesanan", endpoint: "orders", icon: ShoppingCart, periodic: true },
  { label: "Printer", endpoint: "printers", icon: Printer },
];

function StatCard({ label, endpoint, icon: Icon, periodic, period }: StatDef & { period: Period }) {
  const { count, isLoading } = useResourceCount(endpoint, periodic ? periodQuery(period) : {});
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className="brand-gradient flex size-11 shrink-0 items-center justify-center rounded-2xl">
          <Icon className="size-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold text-ink-soft">
            {label}
            {!periodic && period.preset !== "all" && <span className="font-normal text-ink-faint"> · total</span>}
          </p>
          <p className="mt-0.5 text-2xl font-extrabold text-ink">
            {isLoading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-surface-muted" /> : count ?? "-"}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

export default function DashboardHomePage() {
  const { user, isAdmin, isMerchant } = useAuth();
  const [period, setPeriod] = useState<Period>(ALL_TIME);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Halo, {user?.FullName?.split(" ")[0] ?? "!"} 👋</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {isAdmin
            ? `Ringkasan seluruh data platform ${siteConfig.appName}.`
            : "Ringkasan produk dan pesanan yang perlu kamu pantau."}
        </p>
      </div>
      <PeriodFilter label="Periode produk & pesanan" value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((stat) => (
          <StatCard key={stat.endpoint} {...stat} period={period} />
        ))}
      </div>

      {(isAdmin || isMerchant) && <PromoParticipationCard isAdmin={isAdmin} />}

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
