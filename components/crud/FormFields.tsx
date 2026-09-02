"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import type { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from "react-hook-form";
import { apiFetch } from "@/lib/api-client";
import type { FieldConfig, SelectOption } from "@/lib/resources/types";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { FieldLabel, FieldError } from "@/components/ui/FieldLabel";

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

function useDynamicOptions(field: FieldConfig, parentValue: unknown): SelectOption[] {
  const hasParentValue = Boolean(parentValue);
  const shouldFetch =
    field.type === "select" && Boolean(field.optionsEndpoint) && (!field.dependsOn || hasParentValue);

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

  if (field.options) return field.options;
  if (!data) return [];

  const valueKey = field.optionValueKey ?? "Id";
  const labelKey = field.optionLabelKey ?? "Name";
  const rows = Array.isArray(data.data) ? data.data : [];
  return rows.map((row) => ({
    value: row[valueKey] as string | number,
    label: field.optionLabel ? field.optionLabel(row) : String(row[labelKey] ?? row[valueKey]),
  }));
}

function SelectField({ field, register, errors, watch, setValue }: FieldProps) {
  const parentValue = field.dependsOn ? watch(field.dependsOn) : undefined;
  const options = useDynamicOptions(field, parentValue);
  const error = errors[field.name]?.message as string | undefined;
  const locked = Boolean(field.dependsOn) && !parentValue;

  // Only clear this field when the parent's value actually changes after
  // mount — not on the initial render, which would otherwise wipe out an
  // already-consistent CountryId/ProvinceId/CityId trio loaded for editing.
  const mountedRef = useRef(false);
  const prevParentRef = useRef(parentValue);
  useEffect(() => {
    if (!field.dependsOn) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevParentRef.current = parentValue;
      return;
    }
    if (parentValue !== prevParentRef.current) {
      prevParentRef.current = parentValue;
      setValue(field.name, "");
    }
  }, [field.dependsOn, field.name, parentValue, setValue]);

  return (
    <div>
      <FieldLabel required={field.required}>{field.label}</FieldLabel>
      <Select invalid={Boolean(error)} disabled={locked} {...register(field.name)}>
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

export function FormField(props: FieldProps) {
  const { field, register, errors } = props;
  const error = errors[field.name]?.message as string | undefined;

  if (field.type === "select") {
    return <SelectField {...props} />;
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

  const inputType = field.type === "number" || field.type === "password" || field.type === "time" ? field.type : "text";

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
