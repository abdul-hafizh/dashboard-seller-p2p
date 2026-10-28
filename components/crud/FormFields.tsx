"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import type { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from "react-hook-form";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { FieldConfig, SelectOption } from "@/lib/resources/types";
import { toPublicAssetUrl } from "@/lib/resources/format";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { FieldLabel, FieldError } from "@/components/ui/FieldLabel";
import { LocationField } from "./LocationField";

type FormValues = Record<string, unknown>;

interface FieldProps {
  field: FieldConfig;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  watch: UseFormWatch<FormValues>;
  setValue: UseFormSetValue<FormValues>;
}

/** CountryId -> countryId — matches every cascading region endpoint's own
 * `?countryId=`/`?provinceId=` query param naming. */
function dependsOnQueryKey(parentFieldName: string): string {
  return parentFieldName.charAt(0).toLowerCase() + parentFieldName.slice(1);
}

/** The select's options, and whether they're loaded for the current parent value. */
function useDynamicOptions(field: FieldConfig, parentValue: unknown): { options: SelectOption[]; ready: boolean } {
  const hasParentValue = Boolean(parentValue);
  const shouldFetch =
    (field.type === "select" || field.type === "multiselect") && Boolean(field.optionsEndpoint) && (!field.dependsOn || hasParentValue);

  const { data } = useSWR(
    shouldFetch ? ["field-options", field.optionsEndpoint, field.dependsOn ? parentValue : null] : null,
    () =>
      apiFetch<Record<string, unknown>[]>(field.optionsEndpoint as string, {
        query: {
          limit: 500,
          ...(field.dependsOn && hasParentValue ? { [dependsOnQueryKey(field.dependsOn)]: parentValue } : {}),
        },
      }),
  );

  if (field.options) return { options: field.options, ready: true };
  if (!data) return { options: [], ready: false };

  const valueKey = field.optionValueKey ?? "Id";
  const labelKey = field.optionLabelKey ?? "Name";
  const rows = Array.isArray(data.data) ? data.data : [];
  return {
    options: rows.map((row) => ({
      value: row[valueKey] as string | number,
      label: field.optionLabel ? field.optionLabel(row) : String(row[labelKey] ?? row[valueKey]),
    })),
    ready: true,
  };
}

function SelectField({ field, register, errors, watch, setValue }: FieldProps) {
  const parentValue = field.dependsOn ? watch(field.dependsOn) : undefined;
  const { options, ready } = useDynamicOptions(field, parentValue);
  const current = watch(field.name);
  const error = errors[field.name]?.message as string | undefined;
  const locked = Boolean(field.dependsOn) && !parentValue;

  // A dependent select keeps its value until the parent's options have
  // loaded, then drops it only if it isn't one of them — so a consistent
  // Country … Village set (loaded for editing, or filled from a map pin all
  // at once) survives, while picking another parent by hand clears it.
  useEffect(() => {
    if (!field.dependsOn || current === "" || current === undefined || current === null) return;
    if (!parentValue) {
      setValue(field.name, "");
      return;
    }
    if (ready && !options.some((o) => String(o.value) === String(current))) setValue(field.name, "");
  }, [field.dependsOn, field.name, parentValue, ready, options, current, setValue]);

  return (
    <div>
      <FieldLabel required={field.required}>{field.label}</FieldLabel>
      {/* Controlled by the form value, so a value set before its options arrive still shows once they do. */}
      <Select invalid={Boolean(error)} disabled={locked} {...register(field.name)} value={String(current ?? "")}>
        <option value="">{locked ? "Pilih dahulu di atas..." : (field.placeholder ?? "Pilih...")}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      <FieldError message={error} />
      {field.helpText && !error && <p className="mt-1 text-xs text-ink-faint">{field.helpText}</p>}
    </div>
  );
}

function MultiSelectField({ field, errors, watch, setValue }: FieldProps) {
  const { options } = useDynamicOptions(field, undefined);
  const selected = ((watch(field.name) as string[] | undefined) ?? []).map(String);
  const error = errors[field.name]?.message as string | undefined;

  const toggle = (value: string) => {
    const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
    setValue(field.name, next, { shouldDirty: true });
  };

  return (
    <div>
      <FieldLabel required={field.required}>{field.label}</FieldLabel>
      {options.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-xs text-ink-faint">
          {field.placeholder ?? "Belum ada pilihan tersedia."}
        </p>
      ) : (
        <div className="grid max-h-48 gap-1.5 overflow-y-auto rounded-xl border border-border bg-surface p-2 sm:grid-cols-2">
          {options.map((opt) => {
            const value = String(opt.value);
            return (
              <label key={value} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-muted">
                <Checkbox checked={selected.includes(value)} onChange={() => toggle(value)} />
                <span className="text-sm text-ink">{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}
      <FieldError message={error} />
      {field.helpText && !error && <p className="mt-1 text-xs text-ink-faint">{field.helpText}</p>}
    </div>
  );
}

interface UploadedImageResponse {
  FilePath: string;
}

function ImageField({ field, watch, setValue, errors }: FieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const value = watch(field.name) as string | undefined;
  const previewUrl = toPublicAssetUrl(value);
  const error = errors[field.name]?.message as string | undefined;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await apiFetch<UploadedImageResponse>("uploaded-images", { method: "POST", formData });
      setValue(field.name, res.data.FilePath, { shouldValidate: true, shouldDirty: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <FieldLabel required={field.required}>{field.label}</FieldLabel>
      <div className="flex items-center gap-3">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-surface-muted ${
            field.imageAspect === "portrait" ? "h-40 w-[90px]" : "size-20"
          }`}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin text-ink-faint" />
          ) : previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- externally-hosted upload, not worth Next/Image's remote-pattern config
            <img src={previewUrl} alt={field.label} className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-ink-faint" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {value ? "Ganti Gambar" : "Unggah Gambar"}
          </Button>
          {value && !uploading && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink-faint hover:text-error"
              onClick={() => setValue(field.name, "", { shouldValidate: true, shouldDirty: true })}
            >
              <X className="size-3.5" /> Hapus gambar
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      <FieldError message={error} />
      {field.helpText && !error && <p className="mt-1 text-xs text-ink-faint">{field.helpText}</p>}
    </div>
  );
}

export function FormField(props: FieldProps) {
  const { field, register, errors } = props;
  const error = errors[field.name]?.message as string | undefined;

  if (field.type === "select") {
    return <SelectField {...props} />;
  }

  if (field.type === "multiselect") {
    return <MultiSelectField {...props} />;
  }

  if (field.type === "image") {
    return <ImageField {...props} />;
  }

  if (field.type === "location") {
    return <LocationField field={field} watch={props.watch} setValue={props.setValue} />;
  }

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5">
        <Checkbox {...register(field.name)} />
        <span className="text-sm font-medium text-ink">{field.label}</span>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <FieldLabel required={field.required}>{field.label}</FieldLabel>
        <Textarea
          invalid={Boolean(error)}
          placeholder={field.placeholder}
          {...register(field.name)}
        />
        <FieldError message={error} />
      </div>
    );
  }

  const inputType =
    field.type === "datetime"
      ? "datetime-local"
      : field.type === "number" || field.type === "password" || field.type === "time"
        ? field.type
        : "text";

  return (
    <div>
      <FieldLabel required={field.required}>{field.label}</FieldLabel>
      <Input
        type={inputType}
        step={field.type === "number" ? "any" : undefined}
        invalid={Boolean(error)}
        placeholder={field.placeholder}
        {...register(field.name)}
      />
      <FieldError message={error} />
      {field.helpText && !error && <p className="mt-1 text-xs text-ink-faint">{field.helpText}</p>}
    </div>
  );
}
