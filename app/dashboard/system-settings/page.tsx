"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Settings2, Coins } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatCurrency } from "@/lib/resources/format";

interface SystemSetting {
  Id: string;
  Key: string;
  Value: string;
  Description: string | null;
}

interface TokenPricing {
  pricePerToken: number;
  allowedPackages: number[];
  packages: { quantity: number; price: number; description: string }[];
}

function TokenPricingCard() {
  const [pricing, setPricing] = useState<TokenPricing | null>(null);
  const [pricePerTokenDraft, setPricePerTokenDraft] = useState("");
  const [packagesDraft, setPackagesDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<TokenPricing>("system-settings/token-pricing");
      setPricing(res.data);
      setPricePerTokenDraft(String(res.data.pricePerToken));
      setPackagesDraft(res.data.allowedPackages.join(", "));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal memuat harga token AI.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    const allowedPackages = packagesDraft
      .split(",")
      .map((v) => parseInt(v.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (allowedPackages.length === 0) {
      toast.error("Isi minimal satu paket token yang valid (contoh: 20, 40, 50).");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("system-settings/token-pricing", {
        method: "PUT",
        json: { pricePerToken: Number(pricePerTokenDraft), allowedPackages },
      });
      toast.success("Harga token AI berhasil diperbarui.");
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal menyimpan harga token AI.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-4" /> Harga Token AI
        </CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-5">
        {loading ? (
          <FullPageSpinner />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <FieldLabel>Harga per Token (Rp)</FieldLabel>
              <p className="text-xs text-ink-soft">Dipakai untuk menghitung harga setiap paket token AI di aplikasi customer.</p>
              <Input
                type="number"
                value={pricePerTokenDraft}
                onChange={(e) => setPricePerTokenDraft(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel>Pilihan Jumlah Paket Token</FieldLabel>
              <p className="text-xs text-ink-soft">Pisahkan dengan koma, contoh: 20, 40, 50, 100, 200</p>
              <Input value={packagesDraft} onChange={(e) => setPackagesDraft(e.target.value)} className="max-w-md" />
            </div>
            {pricing && pricing.packages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pricing.packages.map((pkg) => (
                  <span
                    key={pkg.quantity}
                    className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-ink-soft"
                  >
                    {pkg.quantity} token · {formatCurrency(pkg.price)}
                  </span>
                ))}
              </div>
            )}
            <div>
              <Button loading={saving} onClick={handleSave}>
                Simpan Harga Token
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
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

      <TokenPricingCard />

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
