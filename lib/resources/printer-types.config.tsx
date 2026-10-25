import type { ResourceConfig } from "./types";

/** "Merk" — printer brands (the printer-types table; only the brand name is used). */
export const printerTypesConfig: ResourceConfig = {
  key: "printer-types",
  endpoint: "printer-types",
  title: "Merk",
  description: "Merk printer 3D yang dipakai saat mendaftarkan printer.",
  searchPlaceholder: "Cari merk...",
  columns: [
    { key: "Brand", label: "Nama Merk", render: (r) => <span className="font-semibold text-ink">{String(r.Brand ?? "-")}</span> },
    {
      key: "Printers",
      label: "Jumlah Printer",
      render: (r) => ((r.Printers as unknown[] | undefined) ?? []).length,
    },
  ],
  fields: [{ name: "Brand", label: "Nama Merk", type: "text", required: true, placeholder: "Bambu Lab" }],
};
