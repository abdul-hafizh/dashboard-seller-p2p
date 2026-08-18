import type { ResourceConfig } from "./types";

export const printProfilesConfig: ResourceConfig = {
  key: "print-profiles",
  endpoint: "print-profiles",
  title: "Profil Cetak",
  description: "Preset pengaturan slicer untuk proses pencetakan.",
  searchPlaceholder: "Cari profil cetak...",
  columns: [
    { key: "Name", label: "Nama" },
    { key: "LayerHeight", label: "Tinggi Layer" },
    { key: "Infill", label: "Infill (%)" },
    { key: "PrintSpeed", label: "Kecepatan" },
    { key: "NozzleTemp", label: "Suhu Nozzle" },
    { key: "BedTemp", label: "Suhu Bed" },
  ],
  fields: [
    { name: "Name", label: "Nama Profil", type: "text", required: true, placeholder: "Fine 0.12mm" },
    { name: "LayerHeight", label: "Tinggi Layer (micron)", type: "number", placeholder: "120" },
    { name: "Infill", label: "Infill (%)", type: "number", placeholder: "20" },
    { name: "PrintSpeed", label: "Kecepatan Cetak (mm/s)", type: "number", placeholder: "60" },
    { name: "NozzleTemp", label: "Suhu Nozzle (°C)", type: "number", placeholder: "210" },
    { name: "BedTemp", label: "Suhu Bed (°C)", type: "number", placeholder: "60" },
  ],
};
