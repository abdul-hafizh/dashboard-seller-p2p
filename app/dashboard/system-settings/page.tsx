"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Settings2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner } from "@/components/ui/Spinner";

interface SystemSetting {
  Id: string;
  Key: string;
  Value: string;
  Description: string | null;
}

export default function SystemSettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<SystemSetting[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<SystemSetting[]>("system/settings");
      setSettings(res.data);
      setDrafts(Object.fromEntries(res.data.map((s) => [s.Key, s.Value])));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal memuat pengaturan sistem.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleSave = async (key: string) => {
    setSavingKey(key);
    try {
      await apiFetch("system/settings", { method: "PUT", json: { Key: key, Value: drafts[key] } });
      toast.success(`Pengaturan "${key}" berhasil diperbarui.`);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal menyimpan pengaturan.");
    } finally {
      setSavingKey(null);
    }
  };

  if (authLoading) return <FullPageSpinner />;

  if (!isAdmin) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Akses terbatas"
        description="Halaman ini hanya bisa diakses oleh Super Admin."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink">Pengaturan Sistem</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Kelola nilai konfigurasi terpusat seperti Base URL API — perubahan berlaku langsung tanpa deploy ulang backend.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-4" /> Nilai Konfigurasi
          </CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          {loading ? (
            <FullPageSpinner />
          ) : !settings || settings.length === 0 ? (
            <p className="text-sm text-ink-soft">Belum ada pengaturan sistem tersimpan.</p>
          ) : (
            settings.map((setting) => (
              <div key={setting.Id} className="flex flex-col gap-2 border-b border-border pb-5 last:border-none last:pb-0">
                <FieldLabel>{setting.Key}</FieldLabel>
                {setting.Description && <p className="text-xs text-ink-soft">{setting.Description}</p>}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={drafts[setting.Key] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [setting.Key]: e.target.value }))}
                    className="sm:flex-1"
                  />
                  <Button
                    variant="outline"
                    loading={savingKey === setting.Key}
                    disabled={drafts[setting.Key] === setting.Value}
                    onClick={() => handleSave(setting.Key)}
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
