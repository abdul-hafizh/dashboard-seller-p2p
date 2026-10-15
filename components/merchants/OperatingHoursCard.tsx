"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Clock, Plus, Trash2, Copy } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { FieldLabel } from "@/components/ui/FieldLabel";

const DAYS = [
  { key: "mon", label: "Senin" },
  { key: "tue", label: "Selasa" },
  { key: "wed", label: "Rabu" },
  { key: "thu", label: "Kamis" },
  { key: "fri", label: "Jumat" },
  { key: "sat", label: "Sabtu" },
  { key: "sun", label: "Minggu" },
] as const;
type DayKey = (typeof DAYS)[number]["key"];

const TIME_ZONES = [
  { value: "Asia/Jakarta", label: "WIB (Asia/Jakarta)" },
  { value: "Asia/Makassar", label: "WITA (Asia/Makassar)" },
  { value: "Asia/Jayapura", label: "WIT (Asia/Jayapura)" },
];
const MAX_SESSIONS = 6;
const ALL_DAY = { Open: "00:00", Close: "24:00" };

interface Session {
  Open: string;
  Close: string;
}

export interface OperatingHours {
  TimeZone: string;
  TemporarilyClosed: boolean;
  ClosedNote: string | null;
  Days: Record<DayKey, Session[]>;
}

export interface OperatingStatus {
  Configured: boolean;
  IsOpen: boolean;
  Label: string | null;
  NextOpenText?: string | null;
  ClosedNote?: string | null;
  Weekly: { Day: DayKey; DayName: string; IsToday: boolean; Text: string }[] | null;
}

interface OperatingHoursResponse {
  MerchantId: string;
  OperatingHours: OperatingHours | null;
  OperatingStatus: OperatingStatus;
}

const isAllDay = (sessions: Session[]) => sessions.some((s) => s.Open === "00:00" && s.Close === "24:00");

function defaultHours(): OperatingHours {
  const weekday = [{ Open: "08:00", Close: "17:00" }];
  return {
    TimeZone: "Asia/Jakarta",
    TemporarilyClosed: false,
    ClosedNote: null,
    Days: { mon: weekday, tue: weekday, wed: weekday, thu: weekday, fri: weekday, sat: weekday, sun: [] },
  };
}

function withAllDays(hours: OperatingHours): OperatingHours {
  const days = { ...hours.Days };
  for (const d of DAYS) days[d.key] = days[d.key] ?? [];
  return { ...hours, Days: days };
}

/** "Buka · tutup 17:00 WIB" / "Tutup · buka besok 08:00 WIB" pill. */
export function OperatingStatusBadge({ status }: { status: OperatingStatus | null | undefined }) {
  if (!status?.Configured || !status.Label) return null;
  return (
    <Badge tone={status.IsOpen ? "success" : "error"}>
      <span className={`size-1.5 rounded-full ${status.IsOpen ? "bg-success" : "bg-error"}`} />
      {status.Label}
    </Badge>
  );
}

/**
 * "Jam Operasional" — the merchant's weekly schedule. Customers in the app
 * see a "Tutup" mark on the store while it's closed, but can still order:
 * the order is processed once the store opens again.
 *
 * Without `merchantId` it edits the logged-in merchant's own schedule; with
 * it (super admin, merchant detail page) it edits that merchant's.
 */
export function OperatingHoursCard({ merchantId }: { merchantId?: string }) {
  const path = merchantId ? `merchants/${merchantId}/operating-hours` : "merchants/me/operating-hours";
  const readPath = merchantId ? `${path}/manage` : path;
  const { data, isLoading, mutate } = useSWR(readPath, () => apiFetch<OperatingHoursResponse>(readPath));
  const current = data?.data;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Clock className="size-4" /> Jam Operasional
        </CardTitle>
        <OperatingStatusBadge status={current?.OperatingStatus} />
      </CardHeader>
      <CardBody>
        {isLoading || !current ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-5" />
          </div>
        ) : (
          // Remount the editor whenever the saved schedule changes so its
          // local form state starts from the server copy.
          <OperatingHoursEditor
            key={JSON.stringify(current.OperatingHours)}
            initial={current.OperatingHours}
            onSave={async (hours) => {
              const res = await apiFetch<OperatingHoursResponse>(path, {
                method: "PUT",
                json: { OperatingHours: hours },
              });
              await mutate(res, { revalidate: false });
            }}
          />
        )}
      </CardBody>
    </Card>
  );
}

function OperatingHoursEditor({
  initial,
  onSave,
}: {
  initial: OperatingHours | null;
  onSave: (hours: OperatingHours | null) => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(initial !== null);
  const [hours, setHours] = useState<OperatingHours>(() => (initial ? withAllDays(initial) : defaultHours()));
  const [saving, setSaving] = useState(false);

  const setDay = (day: DayKey, sessions: Session[]) =>
    setHours((h) => ({ ...h, Days: { ...h.Days, [day]: sessions } }));

  const updateSession = (day: DayKey, index: number, field: keyof Session, value: string) =>
    setDay(
      day,
      hours.Days[day].map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );

  const copyToAll = (day: DayKey) => {
    const source = hours.Days[day];
    setHours((h) => ({
      ...h,
      Days: Object.fromEntries(DAYS.map((d) => [d.key, source.map((s) => ({ ...s }))])) as OperatingHours["Days"],
    }));
    toast.success(`Jadwal ${DAYS.find((d) => d.key === day)?.label} disalin ke semua hari`);
  };

  const validationError = (): string | null => {
    if (!enabled) return null;
    for (const d of DAYS) {
      for (const s of hours.Days[d.key]) {
        if (!s.Open || !s.Close) return `Lengkapi jam buka dan tutup hari ${d.label}.`;
        if (s.Open === s.Close) return `Jam buka dan tutup hari ${d.label} tidak boleh sama.`;
      }
    }
    return null;
  };

  const save = async () => {
    const error = validationError();
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      await onSave(
        enabled ? { ...hours, ClosedNote: hours.ClosedNote?.trim() ? hours.ClosedNote.trim() : null } : null,
      );
      toast.success("Jam operasional disimpan");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan jam operasional.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <label className="flex items-start gap-3">
        <Checkbox checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-0.5" />
        <span>
          <span className="block text-sm font-semibold text-ink">Atur jam operasional toko</span>
          <span className="block text-xs text-ink-soft">
            Jika tidak diatur, toko dianggap selalu buka. Saat toko tutup, customer di aplikasi melihat tanda{" "}
            <b>Tutup</b> tetapi tetap bisa memesan; pesanan diproses setelah jam buka.
          </span>
        </span>
      </label>

      {enabled && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="op-tz">Zona Waktu</FieldLabel>
              <Select
                id="op-tz"
                value={hours.TimeZone}
                onChange={(e) => setHours((h) => ({ ...h, TimeZone: e.target.value }))}
              >
                {TIME_ZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-3.5">
            <label className="flex items-start gap-3">
              <Checkbox
                checked={hours.TemporarilyClosed}
                onChange={(e) => setHours((h) => ({ ...h, TemporarilyClosed: e.target.checked }))}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-semibold text-ink">Tutup sementara</span>
                <span className="block text-xs text-ink-soft">
                  Untuk libur atau cuti. Toko tampil tutup sampai opsi ini dimatikan, apa pun jadwalnya.
                </span>
              </span>
            </label>
            <div>
              <FieldLabel htmlFor="op-note">Keterangan untuk customer (opsional)</FieldLabel>
              <Input
                id="op-note"
                maxLength={200}
                value={hours.ClosedNote ?? ""}
                onChange={(e) => setHours((h) => ({ ...h, ClosedNote: e.target.value }))}
                placeholder="Contoh: Libur Lebaran, buka kembali 5 April"
              />
            </div>
          </div>

          <ul className="divide-y divide-border rounded-xl border border-border">
            {DAYS.map((d) => {
              const sessions = hours.Days[d.key];
              const open = sessions.length > 0;
              const allDay = isAllDay(sessions);
              return (
                <li key={d.key} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start">
                  <div className="flex w-full items-center justify-between gap-3 sm:w-44 sm:shrink-0 sm:pt-2">
                    <label className="flex items-center gap-2.5">
                      <Checkbox
                        checked={open}
                        onChange={(e) => setDay(d.key, e.target.checked ? [{ Open: "08:00", Close: "17:00" }] : [])}
                      />
                      <span className="text-sm font-semibold text-ink">{d.label}</span>
                    </label>
                    {!open && <span className="text-xs font-medium text-ink-faint">Tutup</span>}
                  </div>

                  {open && (
                    <div className="flex-1 space-y-2">
                      {allDay ? (
                        <p className="pt-2 text-sm font-medium text-success">Buka 24 jam</p>
                      ) : (
                        sessions.map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input
                              type="time"
                              aria-label={`Jam buka ${d.label}`}
                              value={s.Open}
                              onChange={(e) => updateSession(d.key, i, "Open", e.target.value)}
                              className="w-32"
                            />
                            <span className="text-xs text-ink-faint">s/d</span>
                            <Input
                              type="time"
                              aria-label={`Jam tutup ${d.label}`}
                              value={s.Close}
                              onChange={(e) => updateSession(d.key, i, "Close", e.target.value)}
                              className="w-32"
                            />
                            {s.Close && s.Open && s.Close < s.Open && (
                              <span className="hidden text-xs text-ink-faint md:inline">(hari berikutnya)</span>
                            )}
                            {sessions.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Hapus sesi"
                                onClick={() => setDay(d.key, sessions.filter((_, j) => j !== i))}
                              >
                                <Trash2 className="size-4 text-error" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {!allDay && sessions.length < MAX_SESSIONS && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDay(d.key, [...sessions, { Open: "13:00", Close: "17:00" }])}
                          >
                            <Plus className="size-3.5" /> Sesi
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDay(d.key, allDay ? [{ Open: "08:00", Close: "17:00" }] : [ALL_DAY])}
                        >
                          <Clock className="size-3.5" /> {allDay ? "Atur jam" : "24 jam"}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => copyToAll(d.key)}>
                          <Copy className="size-3.5" /> Salin ke semua hari
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-ink-soft">
            Jam tutup lebih kecil dari jam buka berarti tutup keesokan harinya (misal 20:00 s/d 02:00). Tambah sesi
            untuk jam istirahat (misal 08:00–12:00 dan 13:00–17:00).
          </p>
        </>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={save} loading={saving}>
          Simpan Jam Operasional
        </Button>
      </div>
    </div>
  );
}
