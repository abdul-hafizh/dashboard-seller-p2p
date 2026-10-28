"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { FieldConfig } from "@/lib/resources/types";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";

type FormValues = Record<string, unknown>;

// Leaflet needs the browser.
const LocationMap = dynamic(() => import("@/components/maps/LocationMap"), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center rounded-xl border border-border text-xs text-ink-faint">Memuat peta...</div>,
});

/** What GET /regions/reverse finds at a point. */
interface PinAddress {
  CountryId: number | null;
  ProvinceId: number | null;
  CityId: number | null;
  DistrictId: number | null;
  VillageId: number | null;
  PostalCode: string | null;
  Street: string | null;
  DisplayName: string | null;
}

// Form fields the pin fills, when the form has them.
const REGION_FIELDS = ["CountryId", "ProvinceId", "CityId", "DistrictId", "VillageId"] as const;

const num = (v: unknown) => (v === "" || v === null || v === undefined ? NaN : Number(v));

/**
 * Map pin for an address form ("location" field): pick a point on the map,
 * drag the pin, or use the browser's location — the form's Latitude /
 * Longitude are set and the country … kelurahan pickers, kode pos and (when
 * empty) the street are filled from that point, like the app's address form.
 */
export function LocationField({
  field,
  watch,
  setValue,
}: {
  field: FieldConfig;
  watch: UseFormWatch<FormValues>;
  setValue: UseFormSetValue<FormValues>;
}) {
  const lat = num(watch("Latitude"));
  const lng = num(watch("Longitude"));
  const position: [number, number] | null = Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  const [busy, setBusy] = useState<"locating" | "reading" | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const set = (name: string, value: unknown) => setValue(name, value, { shouldDirty: true, shouldValidate: true });

  const pick = async (pLat: number, pLng: number) => {
    set("Latitude", pLat.toFixed(7));
    set("Longitude", pLng.toFixed(7));
    setBusy("reading");
    setMessage(null);
    try {
      const res = await apiFetch<PinAddress>("regions/reverse", { query: { lat: pLat, lng: pLng } });
      const a = res.data;
      for (const key of REGION_FIELDS) set(key, a[key] != null ? String(a[key]) : "");
      if (a.PostalCode) set("PostalCode", a.PostalCode);
      if (a.Street && !String(watch("Address") ?? "").trim()) set("Address", a.Street);
      const missing = !a.CityId ? "kota" : !a.DistrictId ? "kecamatan" : !a.VillageId ? "kelurahan" : null;
      setMessage({
        tone: "ok",
        text: missing
          ? `Alamat terisi sebagian dari titik lokasi — pilih ${missing} secara manual.`
          : "Alamat terisi otomatis dari titik lokasi. Periksa kembali sebelum menyimpan.",
      });
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof ApiError ? e.message : "Titik tersimpan, tapi alamat tidak bisa dibaca otomatis. Isi manual." });
    } finally {
      setBusy(null);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ tone: "error", text: "Browser ini tidak mendukung lokasi." });
      return;
    }
    setBusy("locating");
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (p) => void pick(p.coords.latitude, p.coords.longitude),
      (err) => {
        setBusy(null);
        setMessage({
          tone: "error",
          text: err.code === err.PERMISSION_DENIED ? "Izin lokasi ditolak. Izinkan akses lokasi di browser." : "Lokasi tidak bisa diambil. Coba lagi atau pilih di peta.",
        });
      },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  };

  return (
    <div className="space-y-2">
      <FieldLabel>{field.label}</FieldLabel>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={busy !== null}>
          {busy === "locating" ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />} Gunakan lokasi saya
        </Button>
        {busy === "reading" && (
          <span className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Loader2 className="size-3.5 animate-spin" /> Membaca alamat...
          </span>
        )}
        {position && !busy && (
          <span className="flex items-center gap-1 text-xs text-ink-soft">
            <MapPin className="size-3.5 text-brand-purple" /> {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </span>
        )}
      </div>
      <LocationMap position={position} onPick={(a, b) => void pick(a, b)} />
      {message && <p className={`text-xs ${message.tone === "error" ? "text-error" : "text-success"}`}>{message.text}</p>}
      {field.helpText && <p className="text-xs text-ink-faint">{field.helpText}</p>}
    </div>
  );
}
