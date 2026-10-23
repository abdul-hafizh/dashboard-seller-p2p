"use client";

import useSWR from "swr";
import { MapPin, MapPinOff } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { ResourceTable } from "@/components/crud/ResourceTable";
import { buildUserAddressesConfig } from "@/lib/resources/user-addresses.config";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

const sellerAddressConfig = buildUserAddressesConfig(false);

/** The signed-in seller's store addresses (add / edit / delete) — used for pickup, shipping quotes and nearby stores. */
export function StoreAddressCard() {
  return <ResourceTable config={sellerAddressConfig} />;
}

interface AddressRow {
  Id: string;
  Label: string | null;
  RecipientName: string | null;
  Phone: string | null;
  Address: string | null;
  PostalCode: string | null;
  Latitude: number | string | null;
  Longitude: number | string | null;
  IsDefault: boolean | number | null;
  City?: { Name: string | null } | null;
  Province?: { Name: string | null } | null;
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
                    {[a.City?.Name, a.Province?.Name, a.PostalCode].filter(Boolean).join(", ") || "-"}
                    {(a.RecipientName || a.Phone) && ` · ${[a.RecipientName, a.Phone].filter(Boolean).join(" · ")}`}
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
