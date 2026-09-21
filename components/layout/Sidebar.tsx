"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/nav-config";
import { useAuth } from "@/lib/auth-context";
import { siteConfig } from "@/lib/site-config";

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const roleId = user?.RoleId;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-ink/40 md:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform md:static md:z-auto md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="brand-gradient flex size-9 items-center justify-center rounded-xl">
              <Box className="size-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-sm font-extrabold leading-tight text-ink">{siteConfig.appName} Seller</p>
              <p className="text-[11px] font-medium leading-tight text-ink-faint">Dashboard</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-surface-muted md:hidden"
            aria-label="Tutup menu"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((item) => !item.roles || (roleId && item.roles.includes(roleId)));
            if (items.length === 0) return null;
            return (
              <div key={section.title} className="mb-5">
                <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                  {section.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onCloseMobile}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors",
                          active
                            ? "brand-gradient text-white shadow-sm shadow-brand-purple/25"
                            : "text-ink-soft hover:bg-surface-muted hover:text-ink",
                        )}
                      >
                        <Icon className="size-4.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
