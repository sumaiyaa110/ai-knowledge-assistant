const BYTE_UNITS = ["B", "KB", "MB", "GB"];

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${BYTE_UNITS[exponent]}`;
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 hours ago", "yesterday", "just now". */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(seconds) >= size) {
      return relativeFormatter.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}

/** Up to two initials for an avatar, from a name or an email address. */
export function getInitials(nameOrEmail: string): string {
  const words = nameOrEmail.split("@")[0].split(/[\s._-]+/).filter(Boolean);
  const initials = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2);
  return initials.toUpperCase();
}
