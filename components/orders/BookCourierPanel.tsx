"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Bike, Store } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

type CollectionMethod = "pickup" | "drop_off";

interface CourierOptions {
  CollectionMethods: CollectionMethod[];
  Known: boolean;
  Booked: boolean;
}

const OPTIONS: { value: CollectionMethod; title: string; description: string; icon: typeof Bike }[] = [
  { value: "pickup", title: "Dijemput kurir", description: "Kurir datang mengambil paket ke alamat toko.", icon: Bike },
  { value: "drop_off", title: "Antar ke agen kurir", description: "Anda mengantar paket ke agen/counter kurir terdekat.", icon: Store },
];

export const collectionMethodLabel = (m?: string | null) =>
  m === "drop_off" ? "Diantar ke agen kurir" : m === "pickup" ? "Dijemput kurir" : null;

/**
 * "Pesan Kurir" — a paid courier order isn't booked at Biteship until the
 * seller chooses how the parcel reaches the courier: picked up from the store,
 * or dropped off at a courier agent. The waybill (resi) is issued on booking.
 */
export function BookCourierPanel({ orderId, onBooked }: { orderId: string; onBooked: () => void }) {
  const { data } = useSWR(["courier-options", orderId], () => apiFetch<CourierOptions>(`orders/${orderId}/courier-options`));
  const supported = data?.data.CollectionMethods ?? ["pickup", "drop_off"];
  const [method, setMethod] = useState<CollectionMethod>("pickup");
  const [booking, setBooking] = useState(false);
  const chosen = supported.includes(method) ? method : supported[0];

  const book = async () => {
    setBooking(true);
    try {
      const res = await apiFetch(`orders/${orderId}/book-courier`, { method: "POST", json: { CollectionMethod: chosen } });
      toast.success(res.message || "Kurir berhasil dipesan");
      onBooked();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal memesan kurir.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="mt-1 flex flex-col gap-2 rounded-xl border border-brand-orange/40 bg-brand-orange/5 p-3">
      <p className="text-xs font-semibold text-ink">Pesan kurir — bagaimana paket diserahkan ke kurir?</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const available = supported.includes(o.value);
          const active = chosen === o.value;
          return (
            <label
              key={o.value}
              className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-sm ${
                !available ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              } ${active ? "border-brand-purple bg-brand-purple/5" : "border-border bg-surface"}`}
            >
              <input
                type="radio"
                name={`collection-${orderId}`}
                className="mt-1 accent-brand-purple"
                checked={active}
                disabled={!available}
                onChange={() => setMethod(o.value)}
              />
              <o.icon className="mt-0.5 size-4 shrink-0 text-ink-soft" />
              <span>
                <span className="block font-semibold text-ink">{o.title}</span>
                <span className="block text-xs text-ink-soft">
                  {available ? o.description : "Tidak didukung kurir pilihan customer."}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <Button size="sm" className="w-fit" onClick={book} loading={booking} disabled={!chosen}>
        Pesan Kurir
      </Button>
      <p className="text-xs text-ink-faint">Nomor resi dan label terbit setelah kurir dipesan. Customer melihat status &quot;Dikemas&quot; sampai paket dikirim.</p>
    </div>
  );
}
