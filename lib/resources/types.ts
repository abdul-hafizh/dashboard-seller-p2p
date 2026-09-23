import type { ReactNode } from "react";

export type FieldType = "text" | "password" | "number" | "textarea" | "boolean" | "select" | "multiselect" | "time" | "image";

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
  /** Name of another field in this same form whose value scopes this
   * select's options (e.g. ProvinceId depends on CountryId). The query
   * param sent to optionsEndpoint is the parent field name with its first
   * letter lowercased (CountryId -> countryId), matching every cascading
   * region endpoint's existing `?countryId=`/`?provinceId=` filter. The
   * select is disabled and empty until the parent has a value, and clears
   * itself whenever the parent's value actually changes. */
  dependsOn?: string;
  /** For a multiselect field: derives the initially-checked option values from the row being edited. */
  initialFromRow?: (row: Record<string, unknown>) => string[];
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
  /** Runs after a successful create/update with the saved row's id and the submitted payload — for data that lives
   * behind its own endpoint (e.g. a printer's material list). A failure here is reported to the user. */
  afterSave?: (id: string, payload: Record<string, unknown>) => Promise<void>;
  /** Extra per-row action rendered before the built-in Ubah/Hapus buttons (e.g. a link to that row's audit log). */
  rowActions?: (row: T) => ReactNode;
}
