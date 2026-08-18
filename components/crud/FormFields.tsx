"use client";

import useSWR from "swr";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
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
}

function useDynamicOptions(field: FieldConfig): SelectOption[] {
  const shouldFetch = field.type === "select" && Boolean(field.optionsEndpoint);
  const { data } = useSWR(shouldFetch ? ["field-options", field.optionsEndpoint] : null, () =>
    apiFetch<Record<string, unknown>[]>(field.optionsEndpoint as string, { query: { limit: 500 } }),
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

function SelectField({ field, register, errors }: FieldProps) {
  const options = useDynamicOptions(field);
  const error = errors[field.name]?.message as string | undefined;

  return (
    <div>
      <FieldLabel required={field.required}>{field.label}</FieldLabel>
      <Select invalid={Boolean(error)} {...register(field.name)}>
        <option value="">{field.placeholder ?? "Pilih..."}</option>
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
