"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  /** Second line under the label (e.g. an email). */
  hint?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  /** Shown when nothing is picked; picking it again clears the value. */
  placeholder?: string;
  searchPlaceholder?: string;
  /** Label of the current value when it isn't in `options` (e.g. not in this page of results). */
  selectedLabel?: string;
  /** Server-side search: called (already debounced) with what's typed. Without it, options are filtered locally. */
  onQueryChange?: (query: string) => void;
  loading?: boolean;
  className?: string;
  "aria-label"?: string;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** A select you can type into to find an option (like select2) — local or server-side search. */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  searchPlaceholder = "Ketik untuk mencari...",
  selectedLabel,
  onQueryChange,
  loading,
  className,
  "aria-label": ariaLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const current = options.find((o) => o.value === value);
  const buttonLabel = value ? (current?.label ?? selectedLabel ?? value) : placeholder;

  const shown = onQueryChange || !query.trim() ? options : options.filter((o) => norm(`${o.label} ${o.hint ?? ""}`).includes(norm(query.trim())));
  // The first row clears the choice.
  const rows: SearchableOption[] = [{ value: "", label: placeholder }, ...shown];

  // Server search, debounced.
  useEffect(() => {
    if (!onQueryChange) return;
    const t = setTimeout(() => onQueryChange(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query, onQueryChange]);

  // Close on a click outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted row in view.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const openList = () => {
    setOpen(true);
    setActive(Math.max(0, rows.findIndex((r) => r.value === value)));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[active]) pick(rows[active].value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-left text-sm outline-none transition-colors focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/15",
          open && "border-brand-purple ring-2 ring-brand-purple/15",
        )}
      >
        <span className={cn("flex-1 truncate", value ? "text-ink" : "text-ink-soft")}>{buttonLabel}</span>
        {value ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Hapus pilihan"
            onClick={(e) => {
              e.stopPropagation();
              pick("");
            }}
            className="rounded p-0.5 text-ink-faint hover:text-ink"
          >
            <X className="size-3.5" />
          </span>
        ) : null}
        <ChevronDown className="size-4 shrink-0 text-ink-faint" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-full min-w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <div className="relative border-b border-border p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              role="combobox"
              aria-controls={listId}
              aria-expanded
              aria-activedescendant={`${listId}-${active}`}
              className="h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-8 text-sm text-ink outline-none focus:border-brand-purple"
            />
            {loading && <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-faint" />}
          </div>
          <ul ref={listRef} id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {rows.map((o, i) => (
              <li
                key={o.value || "__all"}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o.value)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                  i === active ? "bg-brand-purple/10" : "",
                  i === 0 && "border-b border-border text-ink-soft",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate", i === 0 ? "" : "text-ink")}>{o.label}</p>
                  {o.hint && <p className="truncate text-xs text-ink-faint">{o.hint}</p>}
                </div>
                {o.value === value && <Check className="size-4 shrink-0 text-brand-purple" />}
              </li>
            ))}
            {shown.length === 0 && (
              <li className="px-3 py-3 text-center text-xs text-ink-faint">{loading ? "Mencari..." : "Tidak ditemukan"}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
