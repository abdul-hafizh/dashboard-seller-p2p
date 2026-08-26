export function formatCurrency(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return `Rp${num.toLocaleString("id-ID")}`;
}

export function formatBool(value: unknown, trueLabel = "Aktif", falseLabel = "Nonaktif") {
  return value ? trueLabel : falseLabel;
}

/** Sequelize's TIME type round-trips as an epoch-anchored ISO datetime
 * (e.g. "1970-01-01T07:00:00.000Z") — normalize either that or a plain
 * "HH:MM[:SS]" string down to "HH:MM" for an <input type="time">. */
export function toTimeInputValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const str = String(value);
  const plain = str.match(/^(\d{2}):(\d{2})/);
  if (plain) return `${plain[1]}:${plain[2]}`;
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export function formatTime(value: unknown) {
  const time = toTimeInputValue(value);
  return time || "-";
}

export function formatDate(value: unknown) {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: unknown) {
  if (!value) return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "-";
  const datePart = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  const timePart = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}
