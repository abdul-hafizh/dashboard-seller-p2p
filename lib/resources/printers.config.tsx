import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

export const printersConfig: ResourceConfig = {
  key: "printers",
  endpoint: "printers",
  title: "Printer",
  description: "Mesin printer fisik yang terdaftar per cabang.",
  // Backend's search filter targets a column that doesn't exist on this model, so it's a no-op — hide it rather than show a search box that silently does nothing.
  searchable: false,
  columns: [
    { key: "Name", label: "Nama" },
    { key: "SerialNumber", label: "No. Seri", render: (r) => (r.SerialNumber ? String(r.SerialNumber) : "-") },
    {
      key: "PrintSpeedGramsPerMinute",
      label: "Kecepatan",
      render: (r) => `${r.PrintSpeedGramsPerMinute ?? 1} g/menit`,
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
      label: "Tipe Printer",
      type: "select",
      optionsEndpoint: "printer-types",
      optionLabel: (row) => `${row.Brand ?? ""} ${row.Model ?? ""}`.trim() || "Tanpa nama",
    },
    { name: "SerialNumber", label: "No. Seri", type: "text" },
    {
      name: "PrintSpeedGramsPerMinute",
      label: "Kecepatan Cetak (gram/menit)",
      type: "number",
      placeholder: "60",
      helpText: "Dipakai untuk menghitung estimasi waktu selesai di Antrian Cetak.",
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
    { name: "IsEnabled", label: "Aktif", type: "boolean", defaultValue: true },
  ],
};
