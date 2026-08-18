"use client";

import { Menu, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/Badge";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-lg p-2 text-ink-soft hover:bg-surface-muted md:hidden"
        aria-label="Buka menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="brand-gradient flex size-9 items-center justify-center rounded-full text-xs font-bold text-white">
              {initials(user.FullName)}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-bold leading-tight text-ink">{user.FullName}</p>
              <Badge tone={isAdmin ? "brand" : "info"} className="mt-0.5">
                {isAdmin ? "Super Admin" : "Merchant"}
              </Badge>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => logout()}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-error/30 hover:bg-error/10 hover:text-error"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
