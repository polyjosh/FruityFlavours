"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDownIcon } from "@/components/icons";

type Preset = "today" | "7d" | "30d" | "all" | "custom";

const RANGES: [Preset, string][] = [
  ["today", "Today"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["all", "All time"],
];

/** Report filters. State lives in the URL so the CSV export and reloads use the same filters. */
export function ReportFilters({ categories, category, preset, from, to }: { categories: string[]; category: string; preset: Preset; from: string; to: string }) {
  const router = useRouter();
  const [dates, setDates] = useState({ from, to });

  function go(next: { category?: string; range?: Preset; from?: string; to?: string }) {
    const p = new URLSearchParams();
    const cat = next.category ?? category;
    const range = next.range ?? preset;
    if (cat !== "all") p.set("category", cat);
    p.set("range", range);
    if (range === "custom") {
      p.set("from", next.from ?? dates.from);
      p.set("to", next.to ?? dates.to);
    }
    router.push(`/admin/reports?${p}`);
  }

  return (
    <section className="panel flex flex-wrap items-end gap-4 p-4" aria-label="Filters">
      <div className="field" style={{ width: 210 }}>
        <label className="label" htmlFor="rt">
          Product type
        </label>
        <div className="select-wrap">
          <select id="rt" className="input" style={{ minHeight: 44 }} value={category} onChange={(e) => go({ category: e.target.value })}>
            <option value="all">All products</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDownIcon size={18} />
        </div>
      </div>
      <div className="hidden self-stretch sm:block" style={{ width: 1, background: "var(--line)" }} />
      <div className="field" style={{ width: 160 }}>
        <label className="label" htmlFor="rf">
          From
        </label>
        <input id="rf" className="input" type="date" style={{ minHeight: 44 }} value={dates.from} max={dates.to} onChange={(e) => setDates((d) => ({ ...d, from: e.target.value }))} onBlur={() => dates.from !== from && go({ range: "custom" })} />
      </div>
      <div className="field" style={{ width: 160 }}>
        <label className="label" htmlFor="rto">
          To
        </label>
        <input id="rto" className="input" type="date" style={{ minHeight: 44 }} value={dates.to} min={dates.from} onChange={(e) => setDates((d) => ({ ...d, to: e.target.value }))} onBlur={() => dates.to !== to && go({ range: "custom" })} />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick date ranges">
        {RANGES.map(([id, label]) => (
          <button key={id} className={id === preset ? "pill pill-sm on" : "pill pill-sm"} type="button" aria-pressed={id === preset} onClick={() => go({ range: id })}>
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
