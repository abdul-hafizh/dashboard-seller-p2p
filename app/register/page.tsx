"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, User, Phone, ArrowRight } from "lucide-react";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FieldLabel, FieldError } from "@/components/ui/FieldLabel";
import { Button } from "@/components/ui/Button";

const schema = z
  .object({
    FullName: z.string().min(1, "Nama wajib diisi"),
    Email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
    Phone: z.string().min(1, "No. telepon wajib diisi"),
    Password: z.string().min(6, "Password minimal 6 karakter"),
    ConfirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.Password === data.ConfirmPassword, {
    message: "Password tidak sama",
    path: ["ConfirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        FullName: values.FullName,
        Email: values.Email,
        Phone: values.Phone,
        Password: values.Password,
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      setServerError(payload?.message || "Registrasi gagal. Coba lagi.");
      return;
    }

    const loginRes = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Email: values.Email, Password: values.Password }),
    });
    if (loginRes.ok) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    router.push("/login");
  };

  const handleGoogleCredential = async (idToken: string) => {
    setServerError(null);
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, registerAsMerchant: true }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      setServerError(payload?.message || "Daftar dengan Google gagal. Coba lagi.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <AuthCard
      title="Daftar sebagai Merchant"
      subtitle="Pendaftaran dashboard ini khusus untuk merchant"
      error={serverError}
      footer={
        <>
          Sudah punya akun?{" "}
          <Link href="/login" className="font-bold text-brand-purple hover:underline">
            Masuk
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div>
          <FieldLabel required>Nama Lengkap</FieldLabel>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              placeholder="Nama toko / pemilik"
              invalid={Boolean(errors.FullName)}
              className="pl-10"
              {...register("FullName")}
            />
          </div>
          <FieldError message={errors.FullName?.message} />
        </div>

        <div>
          <FieldLabel required>Email</FieldLabel>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              type="email"
              placeholder="nama@email.com"
              invalid={Boolean(errors.Email)}
              className="pl-10"
              {...register("Email")}
            />
          </div>
          <FieldError message={errors.Email?.message} />
        </div>

        <div>
          <FieldLabel required>No. Telepon</FieldLabel>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              placeholder="08xxxxxxxxxx"
              invalid={Boolean(errors.Phone)}
              className="pl-10"
              {...register("Phone")}
            />
          </div>
          <FieldError message={errors.Phone?.message} />
        </div>

        <div>
          <FieldLabel required>Password</FieldLabel>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <PasswordInput
              placeholder="Minimal 6 karakter"
              invalid={Boolean(errors.Password)}
              className="pl-10"
              {...register("Password")}
            />
          </div>
          <FieldError message={errors.Password?.message} />
        </div>

        <div>
          <FieldLabel required>Konfirmasi Password</FieldLabel>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <PasswordInput
              placeholder="Ulangi password"
              invalid={Boolean(errors.ConfirmPassword)}
              className="pl-10"
              {...register("ConfirmPassword")}
            />
          </div>
          <FieldError message={errors.ConfirmPassword?.message} />
        </div>

        <Button type="submit" size="lg" className="mt-2 w-full" loading={isSubmitting}>
          Daftar
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold text-ink-faint">atau</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />
    </AuthCard>
  );
}
