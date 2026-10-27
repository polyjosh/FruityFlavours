import "server-only";
import { addDays, dayKey, startOfDay } from "@/lib/shared/dates";
import { firstOrderDay } from "./orders";
import { getCategoryNames } from "./catalog";

export type RangePreset = "today" | "7d" | "30d" | "all" | "custom";

const KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Reads ?range=&from=&to=&category= into Nairobi day keys and UTC bounds. Default: last 7 days. */
export async function resolveReportRange(params: Record<string, string | string[] | undefined>) {
  const get = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const today = dayKey(new Date());
  let preset = (get("range") || "7d") as RangePreset;
  let fromKey: string;
  let toKey = today;

  if (preset === "custom" && KEY.test(get("from")) && KEY.test(get("to"))) {
    fromKey = get("from");
    toKey = get("to");
    if (fromKey > toKey) [fromKey, toKey] = [toKey, fromKey];
  } else {
    if (!["today", "7d", "30d", "all"].includes(preset)) preset = "7d";
    fromKey = preset === "today" ? today : preset === "7d" ? addDays(today, -6) : preset === "30d" ? addDays(today, -29) : await firstOrderDay();
    if (fromKey > today) fromKey = today;
  }

  const categories = await getCategoryNames();
  const cat = get("category");
  const category = categories.includes(cat) ? cat : null;

  return { preset, fromKey, toKey, from: startOfDay(fromKey), to: startOfDay(addDays(toKey, 1)), category, categories };
}

export const RANGE_LABEL: Record<RangePreset, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
  custom: "Custom dates",
};
