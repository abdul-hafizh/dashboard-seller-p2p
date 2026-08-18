import type { ReactNode } from "react";

export type FieldType = "text" | "password" | "number" | "textarea" | "boolean" | "select" | "time";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  /** Static options for a select field. */
  options?: SelectOption[];
  /** Resource endpoint to fetch dynamic select options from (e.g. "branches" for a BranchId FK). */
  optionsEndpoint?: string;
  optionValueKey?: string;
  optionLabelKey?: string;
  /** Overrides optionLabelKey when a single field isn't enough (e.g. combining Brand + Model). */
  optionLabel?: (row: Record<string, unknown>) => string;
  defaultValue?: string | number | boolean;
  /** Backing DB column is an INTEGER (0/1), not a real BIT/BOOLEAN — send 1/0 instead of true/false. */
  intBoolean?: boolean;
}

export interface ColumnConfig<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface ResourceConfig<T = Record<string, unknown>> {
  key: string;
  /** Express API endpoint, relative, e.g. "materials". */
  endpoint: string;
  title: string;
  description?: string;
  idKey?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  columns: ColumnConfig<T>[];
  fields: FieldConfig[];
  pageSize?: number;
}
