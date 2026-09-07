"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatCurrency } from "@/lib/resources/format";

const TIER_COLORS: Record<string, string> = {
  BRONZE: "#C77B4A",
  SILVER: "#9AA3AF",
  GOLD: "#E0AA23",
  PLATINUM: "#4FA8E0",
  SOLITAIRE: "#9B2FCE",
};

interface ProfileForm {
  FullName: string;
  Phone: string;
  WhatsappNumber: string;
  TelegramChatId: string;
}

const EMPTY_FORM: ProfileForm = { FullName: "", Phone: "", WhatsappNumber: "", TelegramChatId: "" };

export default function ProfileSettingsPage() {
  const { user, loading, refresh } = useAuth();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      FullName: user.FullName ?? "",
      Phone: user.Phone ?? "",
      WhatsappNumber: user.WhatsappNumber ?? "",
      TelegramChatId: user.TelegramChatId ?? "",
    });
  }, [user]);

  if (loading || !user) return <FullPageSpinner />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch("auth/me", {
        method: "PUT",
        json: {
          FullName: form.FullName,
          Phone: form.Phone || null,
          WhatsappNumber: form.WhatsappNumber || null,
          TelegramChatId: form.TelegramChatId || null,
        },
      });
      toast.success("Profil berhasil diperbarui");
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  const tierColor = TIER_COLORS[user.UserLevel] ?? TIER_COLORS.BRONZE;
  const tier = user.TierDetails;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tier Akun</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span
              className="rounded-full px-3 py-1 text-xs font-extrabold"
              style={{ backgroundColor: `${tierColor}1f`, color: tierColor }}
            >
              {user.UserLevel}
            </span>
            <span className="text-sm font-bold text-ink">Diskon {user.DiscountPercent ?? 0}%</span>
          </div>
          <p className="text-xs text-ink-soft">
            Total transaksi terbayar: <span className="font-semibold text-ink">{formatCurrency(user.TotalSpent ?? 0)}</span>
          </p>
          {tier?.nextTier ? (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, tier.progressPercent))}%`, backgroundColor: tierColor }}
                />
              </div>
              <p className="text-[11px] text-ink-soft">
                {formatCurrency(tier.remainingForNextTier)} lagi menuju tier {tier.nextTier}
              </p>
            </>
          ) : (
            <p className="text-[11px] font-semibold text-ink-soft">Tier tertinggi tercapai 🎉</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil Saya</CardTitle>
        </CardHeader>
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <FieldLabel>Email</FieldLabel>
              <Input value={user.Email} disabled />
            </div>
            <div>
              <FieldLabel required>Nama Lengkap</FieldLabel>
              <Input
                value={form.FullName}
                onChange={(e) => setForm((f) => ({ ...f, FullName: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel>No. Telepon</FieldLabel>
              <Input
                value={form.Phone}
                onChange={(e) => setForm((f) => ({ ...f, Phone: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>No. WhatsApp</FieldLabel>
              <Input
                value={form.WhatsappNumber}
                onChange={(e) => setForm((f) => ({ ...f, WhatsappNumber: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Telegram Chat ID</FieldLabel>
              <Input
                value={form.TelegramChatId}
                onChange={(e) => setForm((f) => ({ ...f, TelegramChatId: e.target.value }))}
                placeholder="Contoh: 123456789"
              />
              <p className="mt-1.5 text-xs text-ink-faint">
                Digunakan untuk mengirim notifikasi pesanan baru lewat Telegram. Dapatkan Chat ID Anda
                dengan mengirim pesan ke bot notifikasi, lalu tempelkan ID yang dibalas di sini.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" loading={saving}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
