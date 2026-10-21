"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Bell, MessageCircle, Store } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useChatUnreadCount } from "@/lib/hooks/use-chat-unread-count";
import { formatDateTime } from "@/lib/resources/format";
import { cn } from "@/lib/utils";

interface NotificationRow {
  Id: string;
  Title: string;
  Message: string;
  NotificationType: string;
  ReferenceId: string | null;
  IsRead: number | boolean;
  CreatedAt: string;
}

const NEW_MERCHANT = "NEW_MERCHANT";

/** Topbar bell: opens a list first — unread chat for merchants, newly
 * registered merchants for admins — and each entry links to its menu. */
export function NotificationBell() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const chatUnread = useChatUnreadCount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data, mutate } = useSWR(
    isAdmin ? ["bell-notifications"] : null,
    async () => {
      const [list, unread] = await Promise.all([
        apiFetch<NotificationRow[]>("notifications", { query: { type: NEW_MERCHANT, limit: 10 } }),
        apiFetch<NotificationRow[]>("notifications", { query: { type: NEW_MERCHANT, isRead: 0, limit: 1 } }),
      ]);
      return { rows: list.data ?? [], unread: unread.pagination?.totalItems ?? 0 };
    },
    { refreshInterval: 30_000 },
  );

  const rows = data?.rows ?? [];
  const showChat = !isAdmin;
  const total = (showChat ? chatUnread : 0) + (data?.unread ?? 0);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const openNotification = async (n: NotificationRow) => {
    if (!n.IsRead) {
      try {
        await apiFetch(`notifications/${n.Id}/read`, { method: "PUT" });
        mutate();
      } catch {
        // Still navigate — the badge refreshes on the next poll.
      }
    }
    go(n.ReferenceId ? `/dashboard/merchants/${n.ReferenceId}` : "/dashboard/merchants");
  };

  const markAllRead = async () => {
    try {
      await apiFetch("notifications/read-all", { method: "PUT" });
      mutate();
    } catch {
      // ignore
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl p-2 text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
        aria-label={total > 0 ? `Notifikasi belum dibaca: ${total}` : "Notifikasi"}
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {total > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-white">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-extrabold text-ink">Notifikasi</p>
            {isAdmin && (data?.unread ?? 0) > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-semibold text-brand-purple hover:underline">
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {showChat && (
              <button
                type="button"
                onClick={() => go("/dashboard/chat")}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
                  <MessageCircle className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink">Pesan</span>
                  <span className="block text-xs text-ink-soft">
                    {chatUnread > 0 ? `${chatUnread} pesan belum dibaca` : "Tidak ada pesan baru"}
                  </span>
                </span>
                {chatUnread > 0 && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-error" />}
              </button>
            )}

            {isAdmin &&
              (rows.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-ink-soft">Belum ada notifikasi.</p>
              ) : (
                rows.map((n) => (
                  <button
                    key={n.Id}
                    type="button"
                    onClick={() => openNotification(n)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-muted",
                      !n.IsRead && "bg-brand-purple/5",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
                      <Store className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink">{n.Title}</span>
                      <span className="block text-xs text-ink-soft">{n.Message}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-faint">{formatDateTime(n.CreatedAt)}</span>
                    </span>
                    {!n.IsRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-error" />}
                  </button>
                ))
              ))}
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => go("/dashboard/merchants")}
              className="block w-full border-t border-border px-4 py-2.5 text-center text-xs font-semibold text-brand-purple hover:bg-surface-muted"
            >
              Lihat semua merchant
            </button>
          )}
        </div>
      )}
    </div>
  );
}
