"use client";

import { CalendarRange } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

export type PeriodPreset = "all" | "today" | "7d" | "30d" | "month" | "lastMonth" | "year" | "custom";

export interface Period {
  preset: PeriodPreset;
  /** YYYY-MM-DD (WIB); empty = open-ended. */
  from: string;
  to: string;
}

export const ALL_TIME: Period = { preset: "all", from: "", to: "" };

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "all", label: "Semua waktu" },
  { value: "today", label: "Hari ini" },
  { value: "7d", label: "7 hari terakhir" },
  { value: "30d", label: "30 hari terakhir" },
  { value: "month", label: "Bulan ini" },
  { value: "lastMonth", label: "Bulan lalu" },
  { value: "year", label: "Tahun ini" },
  { value: "custom", label: "Pilih tanggal…" },
];

// Today's date in WIB, as the backend reads ?from/?to in WIB.
function wibToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .split("-")
    .map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export function presetRange(preset: PeriodPreset): { from: string; to: string } {
  const today = wibToday();
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  switch (preset) {
    case "today":
      return { from: ymd(today), to: ymd(today) };
    case "7d":
      return { from: ymd(addDays(today, -6)), to: ymd(today) };
    case "30d":
      return { from: ymd(addDays(today, -29)), to: ymd(today) };
    case "month":
      return { from: ymd(new Date(Date.UTC(y, m, 1))), to: ymd(today) };
    case "lastMonth":
      return { from: ymd(new Date(Date.UTC(y, m - 1, 1))), to: ymd(new Date(Date.UTC(y, m, 0))) };
    case "year":
      return { from: ymd(new Date(Date.UTC(y, 0, 1))), to: ymd(today) };
    default:
      return { from: "", to: "" };
  }
}

/** The API query for a period (?from=&to=), undefined parts dropped. */
export function periodQuery(p: Period): { from?: string; to?: string } {
  return { from: p.from || undefined, to: p.to || undefined };
}

/**
 * "Periode" control for list screens: a preset (Semua waktu, Hari ini, 7/30
 * hari, Bulan ini, …) or a custom date range. Dates are WIB days, matching
 * the backend's ?from=&to= filter.
 */
export function PeriodFilter({
  value,
  onChange,
  label = "Periode",
  className,
}: {
  value: Period;
  onChange: (p: Period) => void;
  /** What the period is measured on, shown as a tooltip (e.g. "Tanggal pesanan"). */
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} title={label}>
      <div className="relative">
        <CalendarRange className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <Select
          aria-label={label}
          value={value.preset}
          onChange={(e) => {
            const preset = e.target.value as PeriodPreset;
            if (preset === "custom") onChange({ preset, from: value.from, to: value.to });
            else onChange({ preset, ...presetRange(preset) });
          }}
          className="w-full pl-9 sm:w-48"
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>
      {value.preset === "custom" && (
        <>
          <Input
            type="date"
            aria-label="Dari tanggal"
            value={value.from}
            max={value.to || undefined}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="w-full sm:w-40"
          />
          <span className="text-xs text-ink-faint">–</span>
          <Input
            type="date"
            aria-label="Sampai tanggal"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="w-full sm:w-40"
          />
        </>
      )}
    </div>
  );
}
