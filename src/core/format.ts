// Money is stored in minor units (XAF has no decimals, so minor == major here,
// but we keep the convention for portability). Display with thousands separators.

export function formatMoney(amountMinor: number, currency = "XAF"): string {
  const n = Math.round(amountMinor);
  const formatted = new Intl.NumberFormat("en-US").format(Math.abs(n));
  const sign = n < 0 ? "-" : "";
  return `${sign}${formatted} ${currency}`;
}

export function formatMoneyShort(amountMinor: number, currency = "XAF"): string {
  const n = Math.round(amountMinor);
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1_000_000) s = (n / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1) + "M";
  else if (abs >= 1_000) s = (n / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1) + "k";
  else s = String(n);
  return `${s} ${currency}`;
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function toDateInput(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function parseMoneyInput(value: string): number {
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
