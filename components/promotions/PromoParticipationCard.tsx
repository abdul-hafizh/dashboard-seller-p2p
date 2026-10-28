"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Lock, Search, TicketPercent, Users } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatCurrency, formatDateTime, toPublicAssetUrl } from "@/lib/resources/format";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";

interface JoinablePromo {
  Id: number;
  Title: string;
  ImagePath: string | null;
  StartAt: string;
  EndAt: string;
  DiscountPercent: number | string;
  DiscountCategories: string[];
  MaxDiscountPerTransaction: number | null;
  Running: boolean;
  Joined: boolean;
  JoinedBy: "SELLER" | "ADMIN" | null;
  ParticipantCount?: number;
}

interface Participant {
  MerchantId: string;
  StoreName: string;
  FullName: string | null;
  Email: string | null;
  Joined: boolean;
  JoinedBy: "SELLER" | "ADMIN" | null;
}

const CATEGORY_LABEL: Record<string, string> = { READY: "Barang Jadi", PROMPT: "File Via Prompt", PRINT_FILE: "File Siap Print" };

function PromoSummary({ p }: { p: JoinablePromo }) {
  const image = p.ImagePath ? toPublicAssetUrl(p.ImagePath) : null;
  return (
    <div className="flex min-w-0 flex-1 gap-3">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded promo image from the API
        <img src={image} alt="" className="h-20 w-12 shrink-0 rounded-lg border border-border object-cover" />
      )}
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{p.Title}</p>
          <Badge tone={p.Running ? "success" : "info"}>{p.Running ? "Sedang berjalan" : "Terjadwal"}</Badge>
        </div>
        <p className="text-xs text-ink-soft">
          {formatDateTime(p.StartAt)} – {formatDateTime(p.EndAt)}
        </p>
        <p className="text-xs text-ink">
          Diskon <b>{String(p.DiscountPercent).replace(".", ",")}%</b>
          {p.MaxDiscountPerTransaction ? ` · maks ${formatCurrency(p.MaxDiscountPerTransaction)}/transaksi` : ""}
          {p.DiscountCategories.length > 0 && ` · ${p.DiscountCategories.map((c) => CATEGORY_LABEL[c] ?? c).join(", ")}`}
        </p>
      </div>
    </div>
  );
}

/** Seller: the promos they can join, and join / leave them (not when the admin added them). */
function SellerPromos() {
  const { data, isLoading, mutate } = useSWR("promotions-joinable", () => apiFetch<JoinablePromo[]>("promotions/joinable"));
  const [busy, setBusy] = useState<number | null>(null);
  const promos = data?.data ?? [];

  const toggle = async (p: JoinablePromo) => {
    setBusy(p.Id);
    try {
      const res = await apiFetch(`promotions/${p.Id}/join`, { method: p.Joined ? "DELETE" : "POST" });
      toast.success(res.message || "Tersimpan");
      await mutate();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) return <Spinner className="size-5" />;
  if (promos.length === 0) return <p className="text-sm text-ink-soft">Belum ada promo yang bisa diikuti saat ini.</p>;
  return (
    <ul className="divide-y divide-border">
      {promos.map((p) => (
        <li key={p.Id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
          <PromoSummary p={p} />
          {p.Joined && p.JoinedBy === "ADMIN" ? (
            <Badge tone="brand">
              <Lock className="size-3" /> Diikutkan admin
            </Badge>
          ) : (
            <Button size="sm" variant={p.Joined ? "outline" : "primary"} onClick={() => void toggle(p)} loading={busy === p.Id} disabled={busy !== null}>
              {p.Joined ? "Batal Ikut" : "Ikut Promo"}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Admin: pick which sellers take part in a promo (added by the admin = locked for the seller). */
function ParticipantsModal({ promo, onClose, onChanged }: { promo: JoinablePromo; onClose: () => void; onChanged: () => void }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading, mutate } = useSWR(["promotion-participants", promo.Id, search], () =>
    apiFetch<Participant[]>(`promotions/${promo.Id}/participants`, { query: { search: search || undefined } }),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const rows = data?.data ?? [];

  const toggle = async (s: Participant) => {
    setBusy(s.MerchantId);
    try {
      const res = s.Joined
        ? await apiFetch(`promotions/${promo.Id}/participants/${s.MerchantId}`, { method: "DELETE" })
        : await apiFetch(`promotions/${promo.Id}/participants`, { method: "POST", json: { MerchantId: s.MerchantId } });
      toast.success(res.message || "Tersimpan");
      await mutate();
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Peserta: ${promo.Title}`} description="Centang seller untuk mengikutkan mereka (terkunci — seller tidak bisa keluar sendiri). Hapus centang untuk mengeluarkan." size="md">
      <form
        className="relative mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput.trim());
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onBlur={() => setSearch(searchInput.trim())} placeholder="Cari nama toko, nama, atau email lalu Enter" className="pl-9" />
      </form>
      {isLoading ? (
        <Spinner className="size-5" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-soft">Seller tidak ditemukan.</p>
      ) : (
        <ul className="max-h-96 divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {rows.map((s) => (
            <li key={s.MerchantId}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-muted/40">
                <Checkbox checked={s.Joined} disabled={busy !== null} onChange={() => void toggle(s)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{s.StoreName}</p>
                  <p className="truncate text-xs text-ink-faint">{[s.FullName !== s.StoreName && s.FullName, s.Email].filter(Boolean).join(" · ")}</p>
                </div>
                {busy === s.MerchantId ? (
                  <Spinner className="size-4" />
                ) : s.Joined ? (
                  <Badge tone={s.JoinedBy === "ADMIN" ? "brand" : "success"}>{s.JoinedBy === "ADMIN" ? "Diikutkan admin" : "Daftar sendiri"}</Badge>
                ) : null}
              </label>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function AdminPromos() {
  const { data, isLoading, mutate } = useSWR("promotions-joinable", () => apiFetch<JoinablePromo[]>("promotions/joinable"));
  const [managing, setManaging] = useState<JoinablePromo | null>(null);
  const promos = data?.data ?? [];

  if (isLoading) return <Spinner className="size-5" />;
  if (promos.length === 0) return <p className="text-sm text-ink-soft">Tidak ada promo diskon yang berjalan atau terjadwal. Buat di menu Promosi.</p>;
  return (
    <>
      <ul className="divide-y divide-border">
        {promos.map((p) => (
          <li key={p.Id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
            <PromoSummary p={p} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-soft">{p.ParticipantCount ?? 0} seller ikut</span>
              <Button size="sm" variant="outline" onClick={() => setManaging(p)}>
                <Users className="size-4" /> Atur Seller
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {managing && <ParticipantsModal promo={managing} onClose={() => setManaging(null)} onChanged={() => void mutate()} />}
    </>
  );
}

/**
 * Promo Petope on the dashboard home. A promo's discount only applies to the
 * sellers taking part: sellers join here; the admin picks / removes sellers.
 */
export function PromoParticipationCard({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TicketPercent className="size-4" /> Promo Petope
        </CardTitle>
        <p className="mt-0.5 text-xs text-ink-soft">
          {isAdmin
            ? "Diskon promo hanya berlaku untuk seller yang ikut. Atur seller peserta tiap promo di sini."
            : "Ikuti promo agar produkmu di kategori promo mendapat diskon dari Petope. Diskon ditanggung Petope — hak penjualanmu tidak berkurang."}
        </p>
      </CardHeader>
      <CardBody>{isAdmin ? <AdminPromos /> : <SellerPromos />}</CardBody>
    </Card>
  );
}
