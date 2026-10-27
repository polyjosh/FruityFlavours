// All shop dates are shown in Kenya time (Africa/Nairobi, UTC+3, no daylight saving).

const OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A Date shifted so its UTC fields read as Nairobi wall-clock time. */
const local = (d: Date) => new Date(d.getTime() + OFFSET_MS);

/** "YYYY-MM-DD" of the Nairobi calendar day. */
export function dayKey(d: Date): string {
  return local(d).toISOString().slice(0, 10);
}

/** Start of a Nairobi day ("YYYY-MM-DD") as a UTC instant. */
export function startOfDay(key: string): Date {
  return new Date(Date.parse(`${key}T00:00:00Z`) - OFFSET_MS);
}

export function addDays(key: string, n: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

const hhmm = (l: Date) => `${String(l.getUTCHours()).padStart(2, "0")}:${String(l.getUTCMinutes()).padStart(2, "0")}`;

/** "24 Oct 2026" from "2026-10-24". */
export function formatDayKey(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "Sat 18" from "2026-10-18" (chart labels). */
export function shortDayLabel(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()}`;
}

/** "Today, 10:12" · "Yesterday, 17:30" · "Sat 18 Oct, 14:05" (with time) or "Sat 18 Oct". */
export function formatWhen(d: Date, now = new Date(), withTime = true): string {
  const l = local(d);
  const key = dayKey(d);
  const today = dayKey(now);
  const time = withTime ? `, ${hhmm(l)}` : "";
  if (key === today) return `Today${time}`;
  if (key === addDays(today, -1)) return `Yesterday${time}`;
  return `${DAYS[l.getUTCDay()]} ${l.getUTCDate()} ${MONTHS[l.getUTCMonth()]}${time}`;
}

/** Compact admin list time: "10:42" today, "Yesterday 17:30", "18 Oct 14:05". */
export function formatListTime(d: Date, now = new Date()): string {
  const l = local(d);
  const key = dayKey(d);
  const today = dayKey(now);
  if (key === today) return hhmm(l);
  if (key === addDays(today, -1)) return `Yesterday ${hhmm(l)}`;
  return `${l.getUTCDate()} ${MONTHS[l.getUTCMonth()]} ${hhmm(l)}`;
}
