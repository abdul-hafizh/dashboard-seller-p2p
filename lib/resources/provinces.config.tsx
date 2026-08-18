import type { ResourceConfig } from "./types";

export const provincesConfig: ResourceConfig = {
  key: "provinces",
  endpoint: "provinces",
  title: "Provinsi",
  description: "Data wilayah tingkat provinsi, terhubung ke negara.",
  searchPlaceholder: "Cari provinsi...",
  columns: [{ key: "Name", label: "Nama" }],
  fields: [
    { name: "Name", label: "Nama Provinsi", type: "text", required: true, placeholder: "DKI Jakarta" },
    {
      name: "CountryId",
      label: "Negara",
      type: "select",
      required: true,
      optionsEndpoint: "countries",
      optionLabelKey: "Name",
    },
  ],
};
