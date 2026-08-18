import type { ResourceConfig } from "./types";

export const printerTypesConfig: ResourceConfig = {
  key: "printer-types",
  endpoint: "printer-types",
  title: "Tipe Printer",
  description: "Merek, model, dan volume cetak dari tipe printer.",
  // Backend's search filter targets a column that doesn't exist on this model, so it's a no-op — hide it rather than show a search box that silently does nothing.
  searchable: false,
  columns: [
    { key: "Brand", label: "Merek" },
    { key: "Model", label: "Model" },
    { key: "Technology", label: "Teknologi", render: (r) => (r.Technology ? String(r.Technology) : "-") },
    {
      key: "volume",
      label: "Volume Cetak (mm)",
      render: (r) => (r.MaxX && r.MaxY && r.MaxZ ? `${r.MaxX} × ${r.MaxY} × ${r.MaxZ}` : "-"),
    },
  ],
  fields: [
    { name: "Brand", label: "Merek", type: "text", required: true, placeholder: "Bambu Lab" },
    { name: "Model", label: "Model", type: "text", required: true, placeholder: "X1C" },
    {
      name: "Technology",
      label: "Teknologi",
      type: "select",
      options: [
        { value: "FDM", label: "FDM" },
        { value: "SLA", label: "SLA" },
        { value: "SLS", label: "SLS" },
        { value: "DLP", label: "DLP" },
      ],
    },
    { name: "MaxX", label: "Max X (mm)", type: "number", placeholder: "256" },
    { name: "MaxY", label: "Max Y (mm)", type: "number", placeholder: "256" },
    { name: "MaxZ", label: "Max Z (mm)", type: "number", placeholder: "256" },
  ],
};
