import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

export const printersConfig: ResourceConfig = {
  key: "printers",
  endpoint: "printers",
  title: "Printer",
  description: "Daftarkan setiap mesin satu per satu beserta kecepatannya — dipakai untuk estimasi waktu di Antrian Cetak.",
  searchPlaceholder: "Cari nama, merk, atau tipe...",
  columns: [
    { key: "Name", label: "Nama" },
    {
      key: "PrinterType",
      label: "Merk / Tipe",
      render: (r) => {
        const brand = (r.PrinterType as { Brand?: string | null } | null | undefined)?.Brand;
        return (
          <div>
            <p className="text-ink">{brand || "-"}</p>
            <p className="text-xs text-ink-soft">{r.SerialNumber ? String(r.SerialNumber) : "-"}</p>
          </div>
        );
      },
    },
    {
      key: "PrintSpeedGramsPerMinute",
      label: "Kecepatan",
      render: (r) => `${r.PrintSpeedGramsPerMinute ?? 1} g/menit`,
    },
    {
      key: "MaterialType",
      label: "Material",
      render: (r) => <Badge tone={r.MaterialType === "RESIN" ? "info" : "neutral"}>{r.MaterialType === "RESIN" ? "Resin" : "Filament"}</Badge>,
    },
    { key: "CurrentStatus", label: "Status", render: (r) => <Badge tone="info">{String(r.CurrentStatus ?? "-")}</Badge> },
    {
      key: "IsEnabled",
      label: "Aktif",
      render: (r) => <Badge tone={r.IsEnabled ? "success" : "neutral"}>{r.IsEnabled ? "Ya" : "Tidak"}</Badge>,
    },
  ],
  fields: [
    { name: "Name", label: "Nama Printer", type: "text", required: true, placeholder: "Printer #1" },
    {
      name: "PrinterTypeId",
      label: "Merk",
      type: "select",
      required: true,
      placeholder: "Pilih merk...",
      helpText: "Merk belum ada? Tambahkan dulu di menu Merk.",
      optionsEndpoint: "printer-types",
      optionLabel: (row) => String(row.Brand ?? "").trim() || "Tanpa nama",
    },
    {
      name: "SerialNumber",
      label: "Tipe Printer",
      type: "text",
      required: true,
      placeholder: "X1 Carbon",
      helpText: "Isi tipe/model mesin ini, mis. X1 Carbon, A1 Mini, Ender 3 V3.",
    },
    {
      name: "PrintSpeedGramsPerMinute",
      label: "Kecepatan Cetak (gram/menit)",
      type: "number",
      required: true,
      placeholder: "60",
      helpText: "Kecepatan mesin ini sendiri — tiap mesin bisa berbeda walau merk & tipenya sama. Dipakai untuk estimasi waktu selesai di Antrian Cetak.",
    },
    {
      name: "CurrentStatus",
      label: "Status Saat Ini",
      type: "select",
      defaultValue: "IDLE",
      options: [
        { value: "IDLE", label: "Idle" },
        { value: "AVAILABLE", label: "Available" },
        { value: "BUSY", label: "Busy" },
        { value: "MAINTENANCE", label: "Maintenance" },
        { value: "OFFLINE", label: "Offline" },
      ],
    },
    {
      name: "MaterialType",
      label: "Material yang Didukung",
      type: "select",
      required: true,
      defaultValue: "FILAMENT",
      options: [
        { value: "FILAMENT", label: "Filament" },
        { value: "RESIN", label: "Resin" },
      ],
      helpText: "Pilih salah satu: printer filament (FDM) atau resin (SLA/DLP).",
    },
    { name: "IsEnabled", label: "Aktif", type: "boolean", defaultValue: true },
  ],
};
