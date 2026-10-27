import { getReportOrders } from "@/lib/server/orders";
import { RANGE_LABEL, resolveReportRange } from "@/lib/server/reports";
import { buildSalesReport, percentages } from "@/lib/shared/reports";
import { formatDayKey, shortDayLabel } from "@/lib/shared/dates";
import { formatKES } from "@/lib/shared/money";
import { ReportFilters } from "@/components/admin/ReportFilters";
import { DownloadIcon, FilterIcon } from "@/components/admin/icons";

export const dynamic = "force-dynamic";

const n = (v: number) => Math.round(v).toLocaleString("en-US");

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = await resolveReportRange(await searchParams);
  const report = buildSalesReport(await getReportOrders(range.from, range.to), range.category, range.fromKey, range.toKey);

  const typeLabel = range.category ?? "All products";
  const filtered = range.category !== null || range.preset !== "7d";
  const query = new URLSearchParams({ range: range.preset, from: range.fromKey, to: range.toKey, ...(range.category ? { category: range.category } : {}) });

  // Long ranges: show the last 31 days as bars so the chart stays readable.
  const days = report.days.slice(-31);
  const max = Math.max(1, ...days.map((d) => d.revenue));
  const best = days.reduce((a, d) => (d.revenue > a.revenue ? d : a), days[0] ?? { key: "", revenue: 0 });

  const payPct = percentages([report.payment.mpesa, report.payment.delivery, report.payment.pickup]);
  const fulPct = percentages([report.deliveries, report.pickups]);

  const stats = [
    { label: "Revenue", value: formatKES(report.revenue), note: "Excl. delivery fees" },
    { label: "Orders", value: n(report.orders), note: "Paid or pay-on-delivery" },
    { label: "Bottles sold", value: n(report.bottles), note: "Packs count each bottle" },
    { label: "Other products", value: n(report.otherUnits), note: "Cakes and more" },
    { label: "Average order", value: formatKES(report.averageOrder), note: "Revenue ÷ orders" },
    ...(range.category === null ? [{ label: "Delivery fees", value: formatKES(report.deliveryFees), note: `${report.deliveries} ${report.deliveries === 1 ? "delivery" : "deliveries"}` }] : []),
  ];

  return (
    <>
      <div className="flex items-center gap-3">
        <h1 className="h1 mr-auto">Reports</h1>
        <a className="btn btn-secondary" href={`/api/admin/reports/sales.csv?${query}`} download>
          <DownloadIcon size={18} />
          Export CSV
        </a>
      </div>

      <ReportFilters categories={range.categories} category={range.category ?? "all"} preset={range.preset} from={range.fromKey} to={range.toKey} />

      <div className="notice notice-info items-center" role="status">
        <FilterIcon size={18} />
        <span className="flex-1">
          Showing <strong>{typeLabel}</strong> · <strong>{RANGE_LABEL[range.preset]}</strong> ({formatDayKey(range.fromKey)} – {formatDayKey(range.toKey)})
        </span>
        {filtered && (
          <a className="btn btn-ghost btn-sm" href="/admin/reports" style={{ color: "inherit", textDecoration: "underline" }}>
            Clear filters
          </a>
        )}
      </div>

      <div className={`grid gap-3 sm:grid-cols-3 ${stats.length === 6 ? "xl:grid-cols-6" : "xl:grid-cols-5"}`}>
        {stats.map((s) => (
          <div key={s.label} className="panel stat">
            <span className="small muted">{s.label}</span>
            <span className="stat-val" style={{ fontSize: 22 }}>
              {s.value}
            </span>
            <span className="muted" style={{ fontSize: 12 }}>
              {s.note}
            </span>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="panel flex flex-col gap-3.5 p-5" aria-label="Sales by day">
          <div className="flex items-baseline justify-between">
            <h2 className="h3">Sales by day</h2>
            <span className="small muted">KES</span>
          </div>
          {report.orders === 0 ? (
            <p className="muted py-16 text-center">No sales in this period.</p>
          ) : (
            <>
              <div
                className="flex h-60 items-end gap-1.5 pt-5 sm:gap-3.5"
                style={{ borderBottom: "1px solid var(--line)" }}
                role="img"
                aria-label={`Sales by day for ${typeLabel}, highest on ${shortDayLabel(best.key)} with ${formatKES(best.revenue)}`}
              >
                {days.map((d) => (
                  <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${shortDayLabel(d.key)}: ${formatKES(d.revenue)}`}>
                    {days.length <= 14 && (
                      <span className="num" style={{ fontSize: 12, fontWeight: 650 }}>
                        {d.revenue >= 1000 ? `${(d.revenue / 1000).toFixed(1)}k` : n(d.revenue)}
                      </span>
                    )}
                    <div className="w-full" style={{ maxWidth: 48, borderRadius: "6px 6px 0 0", background: d.key === best.key ? "var(--orange)" : "var(--green)", height: `${Math.round((d.revenue / max) * 180)}px`, minHeight: d.revenue ? 2 : 0 }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 sm:gap-3.5">
                {days.map((d, i) => (
                  <span key={d.key} className="small muted flex-1 text-center" style={{ fontSize: days.length > 14 ? 11 : undefined }}>
                    {days.length <= 14 || i % 5 === 0 ? shortDayLabel(d.key) : ""}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section className="panel flex flex-col gap-3.5 p-5" aria-label="Payment method split">
            <h2 className="h3">By payment method</h2>
            <Bar parts={[[payPct[0], "var(--green)"], [payPct[1], "var(--orange)"], [payPct[2], "var(--line-strong)"]]} />
            <div className="flex flex-col gap-1.5">
              <Legend color="var(--green)" label="M-Pesa" value={`${payPct[0]}%`} />
              <Legend color="var(--orange)" label="Pay on delivery" value={`${payPct[1]}%`} />
              <Legend color="var(--line-strong)" label="Pay at pickup" value={`${payPct[2]}%`} />
            </div>
          </section>
          <section className="panel flex flex-col gap-3.5 p-5" aria-label="Delivery versus pickup split">
            <h2 className="h3">Delivery vs pickup</h2>
            <Bar parts={[[fulPct[0], "var(--green)"], [fulPct[1], "var(--orange)"]]} />
            <div className="flex flex-col gap-1.5">
              <Legend color="var(--green)" label="Delivery" value={`${fulPct[0]}% · ${report.deliveries} orders`} />
              <Legend color="var(--orange)" label="Pickup" value={`${fulPct[1]}% · ${report.pickups} orders`} />
            </div>
          </section>
        </div>
      </div>

      <section className="panel overflow-x-auto" aria-label="Top products">
        <div className="px-[18px] pb-1.5 pt-[18px]">
          <h2 className="h3">Top products</h2>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col" style={{ paddingLeft: 18 }}>
                Product
              </th>
              <th scope="col">Type</th>
              <th scope="col" className="r">
                Units sold
              </th>
              <th scope="col" className="r" style={{ paddingRight: 18 }}>
                Revenue
              </th>
            </tr>
          </thead>
          <tbody>
            {report.top.length === 0 && (
              <tr>
                <td colSpan={4} className="muted" style={{ padding: 24, textAlign: "center" }}>
                  No sales in this period.
                </td>
              </tr>
            )}
            {report.top.slice(0, 10).map((p) => (
              <tr key={p.name}>
                <td style={{ paddingLeft: 18, fontWeight: 650 }}>{p.name}</td>
                <td>
                  <span className="badge badge-cat" style={{ height: 22, fontSize: 12 }}>
                    {p.type}
                  </span>
                </td>
                <td className="r num">{n(p.units)}</td>
                <td className="r num" style={{ paddingRight: 18, fontWeight: 650 }}>
                  {formatKES(p.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Bar({ parts }: { parts: [number, string][] }) {
  return (
    <div className="stack" aria-hidden="true">
      {parts.filter(([p]) => p > 0).map(([p, c], i) => (
        <span key={i} style={{ width: `${p}%`, background: c }} />
      ))}
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="leg">
      <i style={{ background: color }} />
      <span className="flex-1">{label}</span>
      <span className="num strong">{value}</span>
    </div>
  );
}
