import { Ruler, Palette, Box, Scale, AlertTriangle, PencilRuler, SlidersHorizontal } from "lucide-react";
import { colorTypeLabel } from "./ColorTypeSelect";

/** What the customer asked for on the app's prompt screen (AIJobs). */
export interface DesignJobSpecs {
  TargetLength?: number | null;
  TargetWidth?: number | null;
  TargetHeight?: number | null;
  /** SINGLE (satu warna → STL) / MULTI (multicolor → 3MF), chosen by the customer. */
  ColorPreference?: string | null;
  /** "Gunakan jasa edit" ticked on the prompt screen — the store prices it. */
  EditServiceRequested?: boolean | null;
}

/** The generated model as measured from its file (AIModels; Depth = panjang, mm). */
export interface DesignModelSpecs {
  Width?: number | null;
  Depth?: number | null;
  Height?: number | null;
  Weight?: number | null;
  /** Solid volume of the scaled mesh, cm³. */
  Volume?: number | null;
  /** Uniform scale applied to the generated mesh (0.41 = 41%). */
  ScaleFactor?: number | null;
  MeasuredAt?: string | null;
  /** Backend utils/meshMetrics weightEstimate(): the billed weight split the way a slicer shows it. */
  DetailedWeightEstimate?: {
    NetModelWeightGrams?: { infill_20_percent_grid?: number | null; solid_100_percent?: number | null } | null;
    SupportAndBrimGrams?: { support_and_brim?: number | null } | null;
    MultiColorWasteGrams?: {
      is_multicolor?: boolean | null;
      estimated_purge_poop?: number | null;
      estimated_prime_tower?: number | null;
      total_waste?: number | null;
    } | null;
    TotalFilamentNeededGrams?: { standard_print_total?: number | null } | null;
    TotalBilledWeightGrams?: number | null;
    SlicerProfile?: { infill?: string | null; walls?: number | null; layerHeightMm?: number | null; support?: string | null } | null;
  } | null;
  /** Multicolour design whose multi-colour 3MF couldn't be made — its 3MF is single-colour. */
  MultiColorFallback?: boolean;
}

const oneDecimal = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",");
const cm = (v: number | null | undefined) => (v != null && Number(v) > 0 ? String(Number(v)).replace(".", ",") : "?");
const mmToCm = (v: number | null | undefined) => (v != null && Number(v) > 0 ? oneDecimal(Number(v) / 10) : "?");
const grams = (g: number) => (g >= 1000 ? `± ${oneDecimal(g / 1000)} kg` : `± ${Math.round(g)} g`);
const num = (v: number | null | undefined) => (v != null && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
/** Plain grams for the breakdown rows: "43,2 g". */
const g1 = (v: number | null | undefined) => (num(v) != null ? `${oneDecimal(num(v)!)} g` : "-");
const mm1 = (v: number | null | undefined) => (num(v) != null ? oneDecimal(num(v)!) : "?");

/**
 * The file's measured numbers and the weight split the way a slicer shows it,
 * so the store can set Anycubic Slicer the same way and compare part by part.
 * Only for a measured AI design.
 */
function SlicerData({ model }: { model: DesignModelSpecs }) {
  const est = model.DetailedWeightEstimate;
  const profile = est?.SlicerProfile;
  const net = num(est?.NetModelWeightGrams?.infill_20_percent_grid);
  const support = num(est?.SupportAndBrimGrams?.support_and_brim);
  const waste = est?.MultiColorWasteGrams;
  const multi = Boolean(waste?.is_multicolor);
  const total = num(est?.TotalBilledWeightGrams) ?? num(model.Weight);
  const scale = num(model.ScaleFactor);
  const volume = num(model.Volume);
  const settings = [
    profile?.layerHeightMm ? `layer ${oneDecimal(profile.layerHeightMm)} mm` : null,
    profile?.infill ? `infill ${profile.infill}` : null,
    profile?.walls ? `${profile.walls} dinding` : null,
    profile?.support ? `support ${profile.support === "Auto" ? "otomatis" : profile.support}` : null,
  ].filter(Boolean);

  const rows: [string, string][] = [
    ["Dimensi file (P × L × T)", `${mm1(model.Depth)} × ${mm1(model.Width)} × ${mm1(model.Height)} mm`],
    ...(scale != null ? ([["Skala dari model asli", `${oneDecimal(scale * 100)}%`]] as [string, string][]) : []),
    ...(volume != null ? ([["Volume padat model", `${oneDecimal(volume)} cm³`]] as [string, string][]) : []),
  ];
  const weightRows: [string, string][] = [
    ["Model (dinding + infill)", g1(net)],
    ["Support & brim", g1(support)],
    ...(multi
      ? ([
          ["Purge ganti warna", g1(waste?.estimated_purge_poop)],
          ["Prime tower", g1(waste?.estimated_prime_tower)],
        ] as [string, string][])
      : []),
  ];

  return (
    <div className="space-y-2 border-t border-border pt-2">
      <p className="inline-flex items-center gap-1.5 font-semibold text-ink">
        <SlidersHorizontal className="size-3.5 text-ink-soft" />
        Data file untuk dicocokkan di slicer
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <table className="w-full">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td className="py-0.5 pr-3 text-ink-soft">{k}</td>
                <td className="py-0.5 text-right font-semibold tabular-nums">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full">
          <tbody>
            {weightRows.map(([k, v]) => (
              <tr key={k}>
                <td className="py-0.5 pr-3 text-ink-soft">{k}</td>
                <td className="py-0.5 text-right font-semibold tabular-nums">{v}</td>
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="py-0.5 pr-3 font-semibold">Total filamen</td>
              <td className="py-0.5 text-right font-bold tabular-nums">{g1(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-ink-faint">
        Dimensi, skala dan volume diukur dari file yang diunduh (sudah diskala dan diletakkan di alas cetak).
        Rincian berat adalah perkiraan sistem dengan setelan Anycubic Slicer{settings.length ? ` (${settings.join(", ")})` : ""}, PLA.
        Berat support di slicer bisa berbeda tergantung bentuk model — cek di slicer sebelum konfirmasi berat.
      </p>
    </div>
  );
}

/**
 * Requested size, colour type and — once the model file is measured — the
 * file's real size, item weight and filament needed. Renders nothing when
 * nothing is known.
 */
export function DesignSpecs({ job, model }: { job: DesignJobSpecs | null | undefined; model?: DesignModelSpecs | null }) {
  const hasDims = Boolean(job && [job.TargetLength, job.TargetWidth, job.TargetHeight].some((v) => v != null && Number(v) > 0));
  const colorType = colorTypeLabel(job?.ColorPreference);
  const isMulti = job?.ColorPreference === "MULTI";
  const measured = Boolean(model?.MeasuredAt);
  const weight = measured && Number(model?.Weight) > 0 ? Number(model!.Weight) : null;
  const totalFilament = Number(model?.DetailedWeightEstimate?.TotalFilamentNeededGrams?.standard_print_total) || null;
  if (!hasDims && !colorType && !measured && !job?.EditServiceRequested) return null;

  return (
    <div className="space-y-1.5 rounded-xl border border-border bg-surface-muted/60 px-3 py-2 text-xs text-ink">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {hasDims && (
          <span className="inline-flex items-center gap-1.5">
            <Ruler className="size-3.5 text-ink-soft" />
            Dimensi diminta (P × L × T): <b>
              {cm(job!.TargetLength)} × {cm(job!.TargetWidth)} × {cm(job!.TargetHeight)} cm
            </b>
          </span>
        )}
        {measured && (
          <span className="inline-flex items-center gap-1.5">
            <Box className="size-3.5 text-ink-soft" />
            Ukuran hasil file: <b>
              {mmToCm(model!.Depth)} × {mmToCm(model!.Width)} × {mmToCm(model!.Height)} cm
            </b>
          </span>
        )}
        {job?.EditServiceRequested && (
          <span className="inline-flex items-center gap-1.5">
            <PencilRuler className="size-3.5 text-ink-soft" />
            <b>Customer meminta jasa edit</b>
          </span>
        )}
        {weight != null && (
          <span className="inline-flex items-center gap-1.5">
            <Scale className="size-3.5 text-ink-soft" />
            Berat barang: <b>{grams(weight)}</b>
            {isMulti && totalFilament != null && !model?.MultiColorFallback && (
              <>
                {" "}· Total filamen: <b>{grams(totalFilament)}</b>
                <span className="text-ink-faint">(termasuk sisa ganti warna)</span>
              </>
            )}
          </span>
        )}
        {/* Under the weight: satu warna or multicolor. */}
        <span className="inline-flex items-center gap-1.5">
          <Palette className="size-3.5 text-ink-soft" />
          Jenis warna: <b>{colorType ? `${colorType} (${isMulti ? "3MF" : "STL"})` : "tidak dipilih"}</b>
        </span>
      </div>
      {measured && (
        <p className="text-ink-faint">Proporsi model dijaga, jadi hanya sisi terpanjang yang sama dengan ukuran diminta.</p>
      )}
      {measured && model?.DetailedWeightEstimate && <SlicerData model={model} />}
      {model?.MultiColorFallback && (
        <p className="inline-flex items-start gap-1.5 font-semibold text-error">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          Pewarnaan multi-filamen gagal diproses, jadi file 3MF berisi satu warna. Atur warna di slicer sesuai catatan customer.
        </p>
      )}
    </div>
  );
}
