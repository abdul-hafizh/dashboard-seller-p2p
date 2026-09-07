"use client";

import { Package, ShoppingCart, Layers, Printer, Building2, Building } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useResourceCount } from "@/lib/hooks/useResourceCount";
import { Card, CardBody } from "@/components/ui/Card";

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
