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

/** Grams + filament length, as the slicer's summary shows them. */
interface GramsMeters {
  grams?: number | null;
  meters?: number | null;
}

/** Totals of an alternative set-up (with / without support, another printer). */
interface AltTotal {
  total_grams?: number | null;
  total_meters?: number | null;
}

/** Backend utils/meshMetrics weightEstimate(): the billed weight split the way a slicer shows it. */
export interface DetailedWeightEstimate {
  InfillPercentage?: number | null;
  Breakdown?: {
    Model?: GramsMeters | null;
    Support?: GramsMeters | null;
    Flushed?: GramsMeters | null;
    Tower?: GramsMeters | null;
    Total?: GramsMeters | null;
  } | null;
  /** Per filament slot (Filament 1–4 for multicolour, one row for single colour). */
  FilamentDetails?: {
    slot: number;
    name?: string | null;
    model?: GramsMeters | null;
    support?: GramsMeters | null;
    flushed?: GramsMeters | null;
    tower?: GramsMeters | null;
    total?: GramsMeters | null;
  }[] | null;
  Settings?: {
    support_enabled?: boolean | null;
    estimated_filament_changes?: number | null;
    measurement_engine?: string | null;
  } | null;
  BranchProfiles?: Record<string, (AltTotal & { printer?: string | null; label?: string | null }) | null> | null;
  Alternatives?: { without_support?: AltTotal | null; with_support?: AltTotal | null } | null;
  MultiColorWasteGrams?: { is_multicolor?: boolean | null } | null;
  TotalFilamentNeededGrams?: { standard_print_total?: number | null; total_billed?: number | null } | null;
  TotalBilledWeightGrams?: number | null;
  SlicerProfile?: {
    printer?: string | null;
    process?: string | null;
    material?: string | null;
    infill?: string | null;
    walls?: number | null;
    topShellLayers?: number | null;
    bottomShellLayers?: number | null;
    layerHeightMm?: number | null;
    flushProfile?: string | null;
    /** Older backends sent a plain string ("Auto"). */
    support?: string | { type?: string | null; thresholdAngle?: number | null; onBuildPlateOnly?: boolean | null } | null;
  } | null;
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
  DetailedWeightEstimate?: DetailedWeightEstimate | null;
  /** Multicolour design whose multi-colour 3MF couldn't be made — its 3MF is single-colour. */
  MultiColorFallback?: boolean;
}

const oneDecimal = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",");
const twoDecimals = (v: number) => (Math.round(v * 100) / 100).toLocaleString("id-ID", { maximumFractionDigits: 2 });
const cm = (v: number | null | undefined) => (v != null && Number(v) > 0 ? String(Number(v)).replace(".", ",") : "?");
const mmToCm = (v: number | null | undefined) => (v != null && Number(v) > 0 ? oneDecimal(Number(v) / 10) : "?");
/** AI design weight, two decimals: "± 23,45 g" / "± 1.234,50 g". */
const grams = (g: number) => `± ${g.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} g`;
const num = (v: number | null | undefined) => (v != null && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
/** Breakdown cells: "43,2 g" / "14,48 m" — "0 g" stays visible (e.g. support off). */
const gCell = (v: number | null | undefined) => (v != null && Number.isFinite(Number(v)) ? `${twoDecimals(Number(v))} g` : "-");
const mCell = (v: number | null | undefined) => (v != null && Number.isFinite(Number(v)) ? `${twoDecimals(Number(v))} m` : "-");
const mm1 = (v: number | null | undefined) => (num(v) != null ? oneDecimal(num(v)!) : "?");

function supportLabel(profile: DetailedWeightEstimate["SlicerProfile"], enabled: boolean | null | undefined): string {
  if (enabled === false) return "support OFF";
  const s = profile?.support;
  if (!s) return enabled ? "support ON" : "";
  if (typeof s === "string") return `support ${s === "Auto" ? "otomatis" : s}`;
  const parts = [s.type, s.thresholdAngle ? `${s.thresholdAngle}°` : null, s.onBuildPlateOnly ? "hanya dari alas" : null].filter(Boolean);
  return `support ${parts.join(", ")}`;
}

/**
 * The file's measured numbers and the weight split the way Anycubic Slicer /
 * OrcaSlicer shows it (grams and metres, per filament for multicolour), so the
 * store can slice with the same settings and compare part by part.
 * Only for a measured AI design.
 */
function SlicerData({ model }: { model: DesignModelSpecs }) {
  const est = model.DetailedWeightEstimate!;
  const profile = est.SlicerProfile;
  const settings = est.Settings;
  const b = est.Breakdown;
  const multi = Boolean(est.MultiColorWasteGrams?.is_multicolor) && !model.MultiColorFallback;
  const supportOn = Boolean(settings?.support_enabled);
  const scale = num(model.ScaleFactor);
  const volume = num(model.Volume);
  const infill = num(est.InfillPercentage);
  const changes = settings?.estimated_filament_changes;
  const fromLayers = Boolean(settings?.measurement_engine?.includes("slicer"));
  const alt = supportOn ? est.Alternatives?.without_support : est.Alternatives?.with_support;

  // Older backends have no Breakdown: only the total is shown.
  const total = b?.Total?.grams ?? num(est.TotalBilledWeightGrams) ?? num(model.Weight);
  const summary: [string, GramsMeters | null | undefined][] = b
    ? [
        ["Model", b.Model],
        ["Support", b.Support],
        ...(multi
          ? ([
              ["Flushed (bilas ganti warna)", b.Flushed],
              ["Tower (prime tower)", b.Tower],
            ] as [string, GramsMeters | null | undefined][])
          : []),
      ]
    : [];

  const fileRows: [string, string][] = [
    ["Dimensi file (P × L × T)", `${mm1(model.Depth)} × ${mm1(model.Width)} × ${mm1(model.Height)} mm`],
    ...(scale != null ? ([["Skala dari model asli", `${oneDecimal(scale * 100)}%`]] as [string, string][]) : []),
    ...(volume != null ? ([["Volume padat model", `${oneDecimal(volume)} cm³`]] as [string, string][]) : []),
    ...(multi && changes != null ? ([["Pergantian filamen", `${changes.toLocaleString("id-ID")} kali`]] as [string, string][]) : []),
  ];

  const settingText = [
    profile?.printer,
    profile?.process,
    profile?.layerHeightMm ? `layer ${oneDecimal(profile.layerHeightMm)} mm` : null,
    infill != null ? `infill ${infill}% Grid` : profile?.infill ? `infill ${profile.infill}` : null,
    profile?.walls ? `${profile.walls} dinding` : null,
    profile?.topShellLayers || profile?.bottomShellLayers ? `${profile?.topShellLayers ?? "?"} top / ${profile?.bottomShellLayers ?? "?"} bottom` : null,
    supportLabel(profile, settings?.support_enabled) || null,
    profile?.material,
    multi ? profile?.flushProfile : null,
  ].filter(Boolean);

  const slots = multi ? (est.FilamentDetails ?? []).filter((f) => (f.total?.grams ?? 0) > 0) : [];
  const branches = multi ? Object.entries(est.BranchProfiles ?? {}).filter(([, p]) => p && num(p.total_grams) != null) : [];

  return (
    <div className="space-y-2 border-t border-border pt-2">
      <p className="inline-flex items-center gap-1.5 font-semibold text-ink">
        <SlidersHorizontal className="size-3.5 text-ink-soft" />
        Data file untuk dicocokkan di slicer
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <table className="w-full">
          <tbody>
            {fileRows.map(([k, v]) => (
              <tr key={k}>
                <td className="py-0.5 pr-3 text-ink-soft">{k}</td>
                <td className="py-0.5 text-right font-semibold tabular-nums">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full">
          <thead>
            <tr className="text-ink-faint">
              <th className="pb-0.5 text-left font-normal">Ringkasan filamen</th>
              <th className="pb-0.5 text-right font-normal">Panjang</th>
              <th className="pb-0.5 text-right font-normal">Berat</th>
            </tr>
          </thead>
          <tbody>
            {summary.map(([k, v]) => (
              <tr key={k}>
                <td className="py-0.5 pr-3 text-ink-soft">{k}</td>
                <td className="py-0.5 pl-2 text-right tabular-nums">{mCell(v?.meters)}</td>
                <td className="py-0.5 pl-2 text-right font-semibold tabular-nums">{gCell(v?.grams)}</td>
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="py-0.5 pr-3 font-semibold">Total</td>
              <td className="py-0.5 pl-2 text-right tabular-nums">{mCell(b?.Total?.meters)}</td>
              <td className="py-0.5 pl-2 text-right font-bold tabular-nums">{gCell(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {slots.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="text-ink-faint">
                <th className="pb-0.5 text-left font-normal">Per filamen</th>
                <th className="pb-0.5 text-right font-normal">Model</th>
                <th className="pb-0.5 text-right font-normal">Flushed</th>
                <th className="pb-0.5 text-right font-normal">Tower</th>
                <th className="pb-0.5 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((f) => (
                <tr key={f.slot}>
                  <td className="py-0.5 pr-3 text-ink-soft">Filamen {f.slot}</td>
                  <td className="py-0.5 pl-2 text-right tabular-nums">{gCell(f.model?.grams)}</td>
                  <td className="py-0.5 pl-2 text-right tabular-nums">{gCell(f.flushed?.grams)}</td>
                  <td className="py-0.5 pl-2 text-right tabular-nums">{gCell(f.tower?.grams)}</td>
                  <td className="py-0.5 pl-2 text-right font-semibold tabular-nums">
                    {gCell(f.total?.grams)} <span className="font-normal text-ink-faint">({mCell(f.total?.meters)})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(num(alt?.total_grams) != null || branches.length > 0) && (
        <ul className="space-y-0.5 text-ink-soft">
          {alt && num(alt.total_grams) != null && (
            <li>
              {supportOn ? "Tanpa support" : "Jika pakai support"}: <b className="text-ink">{gCell(alt.total_grams)}</b> ({mCell(alt.total_meters)})
            </li>
          )}
          {branches.map(([key, p]) => (
            <li key={key}>
              {p?.printer ?? key}
              {p?.label ? ` — ${p.label}` : ""}: <b className="text-ink">{gCell(p?.total_grams)}</b> ({mCell(p?.total_meters)})
            </li>
          ))}
        </ul>
      )}

      <p className="text-ink-faint">
        Dimensi, skala dan volume diukur dari file yang diunduh (sudah diskala dan diletakkan di alas cetak). Ringkasan filamen{" "}
        {fromLayers ? "dihitung dari irisan layer file" : "diperkirakan dari volume model"} dengan setelan
        {settingText.length ? `: ${settingText.join(", ")}` : " standar Anycubic Slicer"}. Pakai setelan yang sama di Anycubic Slicer Next
        untuk membandingkan — hasil slicer tetap bisa sedikit berbeda.
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
  const totalFilament =
    Number(model?.DetailedWeightEstimate?.TotalFilamentNeededGrams?.total_billed ?? model?.DetailedWeightEstimate?.TotalFilamentNeededGrams?.standard_print_total) || null;
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
