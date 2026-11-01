"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { MapPin, MapPinOff, Pencil, Store } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { ResourceForm } from "@/components/crud/ResourceForm";
import { buildUserAddressesConfig } from "@/lib/resources/user-addresses.config";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

// One store address: the same fields as the admin's address form, minus
// "alamat utama" (a seller has just this one).
const storeAddressFields = buildUserAddressesConfig(false).fields.filter((f) => f.name !== "IsDefault");

const regionLine = (a: AddressRow) =>
  [a.Village?.Name && `Kel. ${a.Village.Name}`, a.District?.Name && `Kec. ${a.District.Name}`, a.City?.Name, a.Province?.Name, a.PostalCode]
    .filter(Boolean)
    .join(", ");

const hasPin = (a: AddressRow) => a.Latitude != null && a.Longitude != null && a.Latitude !== "" && a.Longitude !== "";

/**
 * The signed-in seller's store address — one per store, used for pickup,
 * shipping quotes, instant couriers and "Toko Terdekat". Shown as a summary;
 * "Isi / Ubah Alamat" opens the form right in the card.
 */
export function StoreAddressCard() {
  const { data, isLoading, mutate } = useSWR("my-store-address", () => apiFetch<AddressRow[]>("user-addresses", { query: { limit: 1 } }));
  // Newest default first — the same address the backend ships from.
  const address = data?.data?.[0] ?? null;
  const [editing, setEditing] = useState(false);

  const save = async (payload: Record<string, unknown>) => {
    try {
      const body = { ...payload, IsDefault: 1 };
      if (address) await apiFetch(`user-addresses/${address.Id}`, { method: "PUT", json: body });
      else await apiFetch("user-addresses", { method: "POST", json: body });
      toast.success("Alamat toko disimpan");
      setEditing(false);
      await mutate();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal menyimpan alamat toko");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-4" /> Alamat Toko
        </CardTitle>
        {address && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" /> Ubah Alamat
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-5" />
          </div>
        ) : editing ? (
          <ResourceForm
            fields={storeAddressFields}
            initialValues={address ? (address as unknown as Record<string, unknown>) : undefined}
            submitLabel="Simpan Alamat Toko"
            onSubmit={save}
            onCancel={() => setEditing(false)}
          />
        ) : !address ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-ink-soft">
              Toko belum punya alamat. Alamat dipakai untuk ongkir, kurir instan (Gojek/Grab), dan Toko Terdekat di aplikasi —
              tandai titik lokasinya di peta agar terisi otomatis.
            </p>
            <Button size="sm" onClick={() => setEditing(true)}>
              <MapPin className="size-4" /> Isi Alamat Toko
            </Button>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Store className="size-4 text-ink-soft" />
              <span className="font-semibold text-ink">{address.RecipientName || "-"}</span>
              {address.Label && <Badge tone="brand">{address.Label}</Badge>}
            </div>
            <p className="text-ink">{address.Address || "-"}</p>
            {regionLine(address) && <p className="text-xs text-ink-soft">{regionLine(address)}</p>}
            {(address.WhatsappNumber || address.Phone) && (
              <p className="text-xs text-ink-soft">WhatsApp: {address.WhatsappNumber || address.Phone}</p>
            )}
            {hasPin(address) ? (
              <a
                href={`https://www.google.com/maps?q=${address.Latitude},${address.Longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline"
              >
                <MapPin className="size-3" /> Lihat titik lokasi di peta
              </a>
            ) : (
              <p className="inline-flex items-center gap-1 text-xs text-error">
                <MapPinOff className="size-3" /> Belum ada titik lokasi — kurir instan tidak bisa dipakai. Ubah alamat dan tandai di peta.
              </p>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

interface AddressRow {
  Id: string;
  Label: string | null;
  RecipientName: string | null;
  Phone: string | null;
  WhatsappNumber: string | null;
  Address: string | null;
  PostalCode: string | null;
  Latitude: number | string | null;
  Longitude: number | string | null;
  IsDefault: boolean | number | null;
  City?: { Name: string | null } | null;
  Province?: { Name: string | null } | null;
  District?: { Name: string | null } | null;
  Village?: { Name: string | null } | null;
}

/** Read-only list of a seller's addresses, for the admin's seller detail page. */
export function SellerAddressList({ userId }: { userId: string }) {
  const { data, isLoading } = useSWR(["seller-addresses", userId], () => apiFetch<AddressRow[]>(`user-addresses/user/${userId}`));
  const rows = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-4" /> Alamat Toko
        </CardTitle>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-5" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-soft">Seller belum mengisi alamat toko.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((a) => {
              const hasPin = a.Latitude != null && a.Longitude != null && a.Latitude !== "" && a.Longitude !== "";
              return (
                <li key={a.Id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{a.Label || "Alamat"}</span>
                    {Boolean(a.IsDefault) && <Badge tone="success">Utama</Badge>}
                    {hasPin ? (
                      <a
                        href={`https://www.google.com/maps?q=${a.Latitude},${a.Longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline"
                      >
                        <MapPin className="size-3" /> Lihat peta
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
                        <MapPinOff className="size-3" /> Belum ada titik peta
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-ink">{a.Address || "-"}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {[
                      a.Village?.Name && `Kel. ${a.Village.Name}`,
                      a.District?.Name && `Kec. ${a.District.Name}`,
                      a.City?.Name,
                      a.Province?.Name,
                      a.PostalCode,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                    {(a.RecipientName || a.WhatsappNumber || a.Phone) && ` · ${[a.RecipientName, a.WhatsappNumber || a.Phone].filter(Boolean).join(" · ")}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
