import type { ResourceConfig } from "./types";
import { Badge } from "@/components/ui/Badge";

// Must match the backend's utils/modelFormats SUPPORTED_FORMATS.
const FORMAT_OPTIONS = [
  { value: "STL", label: "STL — siap cetak 3D" },
  { value: "3MF", label: "3MF — siap cetak 3D (dibuat dari STL)" },
  { value: "OBJ", label: "OBJ" },
  { value: "GLB", label: "GLB" },
  { value: "FBX", label: "FBX" },
  { value: "USDZ", label: "USDZ (iPhone / AR)" },
];

/** Aktivitas Meshy › file types customers may download for their AI designs in the app. */
export const modelFormatsConfig: ResourceConfig = {
  key: "model-formats",
  endpoint: "model-formats",
  title: "Tipe File Unduhan",
  description: "Tipe file hasil generate Meshy yang bisa diunduh customer di aplikasi. Hanya yang aktif yang muncul.",
  searchable: false,
  pageSize: 50,
  columns: [
    { key: "Code", label: "Tipe", render: (r) => <span className="font-bold text-ink">{String(r.Code)}</span> },
    { key: "Label", label: "Nama di Aplikasi" },
    { key: "Description", label: "Keterangan", render: (r) => (r.Description as string | null) || "-" },
    { key: "SortOrder", label: "Urutan" },
    {
      key: "IsActive",
      label: "Status",
      render: (r) => <Badge tone={r.IsActive ? "success" : "neutral"}>{r.IsActive ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ],
  fields: [
    { name: "Code", label: "Tipe File", type: "select", required: true, options: FORMAT_OPTIONS },
    { name: "Label", label: "Nama di Aplikasi", type: "text", placeholder: "STL", helpText: "Kosongkan untuk memakai nama tipe file." },
    { name: "Description", label: "Keterangan", type: "text", placeholder: "Format cetak 3D paling umum" },
    { name: "SortOrder", label: "Urutan", type: "number", placeholder: "1", defaultValue: 0 },
    { name: "IsActive", label: "Tampilkan di aplikasi", type: "boolean", defaultValue: true },
  ],
};
