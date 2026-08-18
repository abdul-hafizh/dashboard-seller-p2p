import type { ResourceConfig } from "./types";

export const citiesConfig: ResourceConfig = {
  key: "cities",
  endpoint: "cities",
  title: "Kota",
  description: "Data wilayah tingkat kota, terhubung ke provinsi.",
  searchPlaceholder: "Cari kota...",
  columns: [{ key: "Name", label: "Nama" }],
  fields: [
    { name: "Name", label: "Nama Kota", type: "text", required: true, placeholder: "Jakarta Selatan" },
    {
      name: "ProvinceId",
      label: "Provinsi",
      type: "select",
      required: true,
      optionsEndpoint: "provinces",
      optionLabelKey: "Name",
    },
  ],
};
