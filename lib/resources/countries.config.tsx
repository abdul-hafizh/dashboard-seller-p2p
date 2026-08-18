import type { ResourceConfig } from "./types";

export const countriesConfig: ResourceConfig = {
  key: "countries",
  endpoint: "countries",
  title: "Negara",
  description: "Data wilayah tingkat negara.",
  // Backend's search filter targets a column that doesn't exist on this model, so it's a no-op — hide it rather than show a search box that silently does nothing.
  searchable: false,
  columns: [
    { key: "Name", label: "Nama" },
    { key: "IsoCode", label: "Kode ISO", render: (r) => (r.IsoCode ? String(r.IsoCode) : "-") },
  ],
  fields: [
    { name: "Name", label: "Nama Negara", type: "text", required: true, placeholder: "Indonesia" },
    { name: "IsoCode", label: "Kode ISO", type: "text", placeholder: "ID" },
  ],
};
