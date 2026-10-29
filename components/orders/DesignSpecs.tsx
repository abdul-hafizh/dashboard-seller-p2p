import { Ruler, Palette, Box, Scale, AlertTriangle, PencilRuler } from "lucide-react";
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
  MeasuredAt?: string | null;
  DetailedWeightEstimate?: {
    TotalFilamentNeededGrams?: { standard_print_total?: number | null } | null;
  } | null;
  /** Multicolour design whose multi-colour 3MF couldn't be made — its 3MF is single-colour. */
  MultiColorFallback?: boolean;
}

const oneDecimal = (v: number) => String(Math.round(v * 10) / 10).replace(".", ",");
const cm = (v: number | null | undefined) => (v != null && Number(v) > 0 ? String(Number(v)).replace(".", ",") : "?");
const mmToCm = (v: number | null | undefined) => (v != null && Number(v) > 0 ? oneDecimal(Number(v) / 10) : "?");
const grams = (g: number) => (g >= 1000 ? `± ${oneDecimal(g / 1000)} kg` : `± ${Math.round(g)} g`);

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
        <span className="inline-flex items-center gap-1.5">
          <Palette className="size-3.5 text-ink-soft" />
          Jenis warna: <b>{colorType ? `${colorType} (${isMulti ? "3MF" : "STL"})` : "tidak dipilih"}</b>
        </span>
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
      </div>
      {measured && (
        <p className="text-ink-faint">Proporsi model dijaga, jadi hanya sisi terpanjang yang sama dengan ukuran diminta.</p>
      )}
      {model?.MultiColorFallback && (
        <p className="inline-flex items-start gap-1.5 font-semibold text-error">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          Pewarnaan multi-filamen gagal diproses, jadi file 3MF berisi satu warna. Atur warna di slicer sesuai catatan customer.
        </p>
      )}
    </div>
  );
}
