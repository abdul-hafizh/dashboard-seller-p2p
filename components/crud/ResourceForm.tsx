"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { FieldConfig } from "@/lib/resources/types";
import { toTimeInputValue } from "@/lib/resources/format";
import { FormField } from "./FormFields";
import { Button } from "@/components/ui/Button";

type FormValues = Record<string, unknown>;

function buildSchema(fields: FieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of fields) {
    if (field.type === "boolean") {
      shape[field.name] = z.boolean().optional();
      continue;
    }

    let schema = z.string();
    if (field.type === "number") {
      schema = schema.refine((v) => v === "" || !Number.isNaN(Number(v)), {
        message: `${field.label} harus berupa angka`,
      });
    }

    shape[field.name] = field.required ? schema.min(1, `${field.label} wajib diisi`) : schema.optional();
  }
  return z.object(shape);
}

function buildDefaultValues(fields: FieldConfig[], initial?: Record<string, unknown>): FormValues {
  const values: FormValues = {};
  for (const field of fields) {
    const raw = initial?.[field.name] ?? field.defaultValue;
    if (field.type === "boolean") {
      values[field.name] = Boolean(raw);
    } else if (field.type === "time") {
      values[field.name] = toTimeInputValue(raw);
    } else {
      values[field.name] = raw === null || raw === undefined ? "" : String(raw);
    }
  }
  return values;
}

function toPayload(fields: FieldConfig[], values: FormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field.name];
    if (field.type === "boolean") {
      payload[field.name] = field.intBoolean ? (raw ? 1 : 0) : Boolean(raw);
    } else if (field.type === "number") {
      payload[field.name] = raw === "" || raw === undefined ? null : Number(raw);
    } else {
      payload[field.name] = raw === "" || raw === undefined ? null : raw;
    }
  }
  return payload;
}

interface ResourceFormProps {
  fields: FieldConfig[];
  initialValues?: Record<string, unknown>;
  submitLabel: string;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function ResourceForm({ fields, initialValues, submitLabel, onSubmit, onCancel }: ResourceFormProps) {
  const schema = buildSchema(fields);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(fields, initialValues),
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit(toPayload(fields, values));
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {fields.map((field) => (
        <FormField key={field.name} field={field} register={register} errors={errors} watch={watch} setValue={setValue} />
      ))}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
