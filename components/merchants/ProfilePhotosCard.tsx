"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Store, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { toPublicAssetUrl } from "@/lib/resources/format";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

/** "Foto Profil & Toko" on Profil Saya: the owner's photo (everyone) and the
 * store photo (merchants), each uploaded on pick. */
export function ProfilePhotosCard() {
  const { user, isMerchant } = useAuth();
  if (!user) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isMerchant ? "Foto Profil & Toko" : "Foto Profil"}</CardTitle>
      </CardHeader>
      <CardBody className="grid gap-6 sm:grid-cols-[auto_1fr]">
        <PhotoPicker
          label="Foto Profil"
          hint="Tampil di chat dan pesanan."
          endpoint="auth/me/avatar"
          field="avatar"
          value={user.Avatar}
          shape="circle"
        />
        {isMerchant && (
          <PhotoPicker
            label="Foto Toko"
            hint="Tampil di daftar toko pada aplikasi customer."
            endpoint="auth/me/store-photo"
            field="photo"
            value={user.StorePhoto ?? null}
            shape="wide"
          />
        )}
      </CardBody>
    </Card>
  );
}

function PhotoPicker({
  label,
  hint,
  endpoint,
  field,
  value,
  shape,
}: {
  label: string;
  hint: string;
  endpoint: string;
  field: string;
  value: string | null;
  shape: "circle" | "wide";
}) {
  const { refresh } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const url = toPublicAssetUrl(value);
  const Icon = shape === "circle" ? User : Store;

  const onPick = async (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) return toast.error("Foto harus JPG, PNG, atau WEBP.");
    if (file.size > MAX_BYTES) return toast.error("Ukuran foto maksimal 5 MB.");

    const formData = new FormData();
    formData.append(field, file);
    setUploading(true);
    try {
      const res = await apiFetch(endpoint, { method: "POST", formData });
      toast.success(res.message || `${label} diperbarui`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : `Gagal mengunggah ${label.toLowerCase()}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-bold text-ink">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "group relative flex items-center justify-center overflow-hidden border border-border bg-surface-muted",
          shape === "circle" ? "size-28 rounded-full" : "aspect-[16/9] w-full max-w-sm rounded-2xl",
        )}
        aria-label={`Ganti ${label.toLowerCase()}`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="size-full object-cover" />
        ) : (
          <Icon className="size-8 text-ink-faint" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? <Spinner className="size-5 text-white" /> : <Camera className="size-5 text-white" />}
        </span>
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Spinner className="size-5 text-white" />
          </span>
        )}
      </button>
      <div>
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} loading={uploading}>
          {url ? "Ganti Foto" : "Unggah Foto"}
        </Button>
        <p className="mt-1.5 text-xs text-ink-faint">{hint} JPG, PNG, atau WEBP, maks. 5 MB.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
    </div>
  );
}
