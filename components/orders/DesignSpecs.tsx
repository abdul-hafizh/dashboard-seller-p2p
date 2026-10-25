import { Ruler, Palette } from "lucide-react";
import { colorTypeLabel } from "./ColorTypeSelect";

/** What the customer asked for on the app's prompt screen (AIJobs). */
export interface DesignJobSpecs {
  TargetLength?: number | null;
  TargetWidth?: number | null;
  TargetHeight?: number | null;
  ColorPreference?: string | null;
}

const cm = (v: number | null | undefined) => (v != null && Number(v) > 0 ? String(Number(v)).replace(".", ",") : "?");

/** "Dimensi diminta: 10 × 5 × 8 cm" + the customer's optional colour wish. Renders nothing when neither is known. */
export function DesignSpecs({ job }: { job: DesignJobSpecs | null | undefined }) {
  const hasDims = Boolean(job && [job.TargetLength, job.TargetWidth, job.TargetHeight].some((v) => v != null && Number(v) > 0));
  const wish = colorTypeLabel(job?.ColorPreference);
  if (!hasDims && !wish) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-xl border border-border bg-surface-muted/60 px-3 py-2 text-xs text-ink">
      {hasDims && (
        <span className="inline-flex items-center gap-1.5">
          <Ruler className="size-3.5 text-ink-soft" />
          Dimensi diminta (P × L × T): <b>
            {cm(job!.TargetLength)} × {cm(job!.TargetWidth)} × {cm(job!.TargetHeight)} cm
          </b>
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <Palette className="size-3.5 text-ink-soft" />
        Preferensi warna customer: <b>{wish ?? "tidak memilih"}</b>
      </span>
    </div>
  );
}
