"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Send, CheckCircle2, ExternalLink, Unlink } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Spinner } from "@/components/ui/Spinner";

interface TelegramStatus {
  Configured: boolean;
  BotUsername: string | null;
  ConnectUrl: string | null;
  TelegramChatId: string | null;
}

const errorMessage = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/** Seller › Pengaturan Profil: Telegram notifications for paid / cancelled orders, AI designs to confirm, and customer chats. */
export function TelegramCard() {
  const { data, isLoading, mutate } = useSWR("auth/me/telegram", () => apiFetch<TelegramStatus>("auth/me/telegram"));
  const status = data?.data;
  const [busy, setBusy] = useState<"detect" | "test" | "save" | "unlink" | null>(null);
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(false);

  const act = async (kind: NonNullable<typeof busy>, fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const detect = () =>
    act("detect", async () => {
      try {
        await apiFetch("auth/me/telegram/detect", { method: "POST" });
        toast.success("Telegram terhubung. Cek pesan dari bot.");
        await mutate();
      } catch (e) {
        toast.error(errorMessage(e, "Gagal mengecek koneksi Telegram"));
      }
    });

  const test = () =>
    act("test", async () => {
      try {
        await apiFetch("auth/me/telegram/test", { method: "POST" });
        toast.success("Pesan tes terkirim ke Telegram");
      } catch (e) {
        toast.error(errorMessage(e, "Pesan tes gagal dikirim"));
      }
    });

  const saveManual = () =>
    act("save", async () => {
      const id = manual.trim();
      if (!/^-?\d{5,20}$/.test(id)) {
        toast.error("Chat ID berupa angka, contoh: 123456789");
        return;
      }
      try {
        await apiFetch("auth/me", { method: "PUT", json: { TelegramChatId: id } });
        toast.success("Chat ID disimpan. Kirim pesan tes untuk memastikan.");
        setManual("");
        setShowManual(false);
        await mutate();
      } catch (e) {
        toast.error(errorMessage(e, "Gagal menyimpan Chat ID"));
      }
    });

  const unlink = () =>
    act("unlink", async () => {
      try {
        await apiFetch("auth/me/telegram", { method: "DELETE" });
        toast.success("Notifikasi Telegram dimatikan");
        await mutate();
      } catch (e) {
        toast.error(errorMessage(e, "Gagal memutus Telegram"));
      }
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="size-4" /> Notifikasi Telegram
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4 text-sm">
        <p className="text-ink-soft">
          Dapatkan pesan Telegram saat ada pesanan baru dibayar, pesanan desain AI yang perlu dikonfirmasi beratnya,
          pesanan dibatalkan, dan chat baru dari customer.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner className="size-5" />
          </div>
        ) : !status?.Configured ? (
          <p className="rounded-xl bg-surface-muted px-3.5 py-3 text-ink-soft">Bot Telegram belum diatur oleh admin.</p>
        ) : status.TelegramChatId ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3.5 py-3 text-success">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                Terhubung ke <b>@{status.BotUsername}</b> · Chat ID {status.TelegramChatId}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" loading={busy === "test"} onClick={test}>
                <Send className="size-4" /> Kirim Pesan Tes
              </Button>
              <Button type="button" variant="outline" size="sm" loading={busy === "unlink"} onClick={unlink}>
                <Unlink className="size-4" /> Putuskan
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ol className="list-decimal space-y-1 pl-5 text-ink-soft">
              <li>
                Buka bot <b>@{status.BotUsername}</b> lewat tombol di bawah, lalu tekan <b>Start</b> di Telegram.
              </li>
              <li>
                Kembali ke sini dan klik <b>Cek Koneksi</b>.
              </li>
            </ol>
            <div className="flex flex-wrap gap-2">
              {status.ConnectUrl && (
                <a href={status.ConnectUrl} target="_blank" rel="noreferrer">
                  <Button type="button" size="sm">
                    <ExternalLink className="size-4" /> Buka Bot Telegram
                  </Button>
                </a>
              )}
              <Button type="button" variant="outline" size="sm" loading={busy === "detect"} onClick={detect}>
                Cek Koneksi
              </Button>
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-brand-purple hover:underline"
              onClick={() => setShowManual((v) => !v)}
            >
              {showManual ? "Tutup" : "Atau isi Chat ID secara manual"}
            </button>
            {showManual && (
              <div className="space-y-2">
                <FieldLabel>Telegram Chat ID</FieldLabel>
                <div className="flex gap-2">
                  <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Contoh: 123456789" />
                  <Button type="button" variant="outline" loading={busy === "save"} onClick={saveManual}>
                    Simpan
                  </Button>
                </div>
                <p className="text-xs text-ink-faint">
                  Chat ID bisa dilihat dengan mengirim pesan ke @userinfobot di Telegram. Tetap tekan Start di @
                  {status.BotUsername} agar bot boleh mengirim pesan ke Anda.
                </p>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
