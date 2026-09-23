"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, History } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatDateTime } from "@/lib/resources/format";

interface ProfileLogEntry {
  Id: string;
  Field: string;
  OldValue: string | null;
  NewValue: string | null;
  CreatedAt: string | null;
}

interface ProfileLogsMeta {
  user: { Id: string; FullName: string | null; Email: string | null };
}

/** Human labels for the fields ProfileEditLogs can carry — mirrors
 * AuthService.updateProfile's logProfileEdits on the backend. */
const FIELD_LABELS: Record<string, string> = {
  FullName: "Nama Lengkap",
  Phone: "No. Telepon",
  WhatsappNumber: "No. WhatsApp",
};

export default function UserProfileLogsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;

  const { data, isLoading, error } = useSWR(["users", userId, "profile-logs"], () =>
    apiFetch<ProfileLogEntry[]>(`users/${userId}/profile-logs`, { query: { limit: 100 } }),
  );

  if (isLoading) return <FullPageSpinner />;

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton onClick={() => router.back()} />
        <Card>
          <CardBody className="py-10 text-center text-sm text-ink-soft">
            {error instanceof ApiError ? error.message : "Gagal memuat riwayat perubahan profil."}
          </CardBody>
        </Card>
      </div>
    );
  }

  const logs = data?.data ?? [];
  const user = (data?.meta as ProfileLogsMeta | undefined)?.user;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <BackButton onClick={() => router.back()} />
        <div>
          <h1 className="text-lg font-extrabold text-ink">Riwayat Perubahan Profil</h1>
          <p className="text-xs text-ink-soft">
            {user ? `${user.FullName ?? "-"} · ${user.Email ?? "-"}` : "Memuat data pengguna..."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4" /> Log Perubahan
          </CardTitle>
        </CardHeader>
        <CardBody>
          {logs.length === 0 ? (
            <EmptyState
              icon={History}
              title="Belum ada perubahan"
              description="Pengguna ini belum pernah mengubah profilnya sendiri."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                    <th className="whitespace-nowrap px-4 py-3">Kolom</th>
                    <th className="whitespace-nowrap px-4 py-3">Nilai Lama</th>
                    <th className="whitespace-nowrap px-4 py-3">Nilai Baru</th>
                    <th className="whitespace-nowrap px-4 py-3">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.Id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">
                        {FIELD_LABELS[log.Field] ?? log.Field}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{log.OldValue || "-"}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{log.NewValue || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatDateTime(log.CreatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label="Kembali">
      <ArrowLeft className="size-4.5" />
    </Button>
  );
}
