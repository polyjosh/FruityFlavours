import Link from "next/link";
import { getNotificationLog, type NotificationFilter } from "@/lib/server/notifications";
import { smsConfigured } from "@/lib/server/sms";
import { formatListTime } from "@/lib/shared/dates";
import { formatLocalPhone } from "@/lib/shared/phone";
import { ResendButton } from "@/components/admin/ResendButton";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const f = (await searchParams).filter;
  const filter: NotificationFilter = f === "sent" || f === "failed" ? f : "all";
  const { rows, counts } = await getNotificationLog(filter);
  const configured = smsConfigured();

  const pills: [NotificationFilter, string][] = [
    ["all", `All · ${counts.all}`],
    ["sent", `Sent · ${counts.sent}`],
    ["failed", `Failed · ${counts.failed}`],
  ];

  return (
    <>
      <div>
        <h1 className="h1">Notifications log</h1>
        <p className="small muted">Every SMS sent to customers and to the shop. Failed messages can be resent.</p>
      </div>
      {!configured && (
        <p className="notice notice-orange">
          SMS isn’t set up yet (Africa’s Talking keys missing), so messages stay “Not sent”. Add AT_USERNAME and AT_API_KEY to send them.
        </p>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter messages">
        {pills.map(([id, label]) => (
          <Link key={id} className={id === filter ? "pill pill-sm on" : "pill pill-sm"} href={id === "all" ? "/admin/notifications" : `/admin/notifications?filter=${id}`} aria-current={id === filter ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </div>
      <section className="panel overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col" style={{ paddingLeft: 18, width: 140 }}>
                Time
              </th>
              <th scope="col" style={{ width: 200 }}>
                Recipient
              </th>
              <th scope="col">Message</th>
              <th scope="col" className="r" style={{ paddingRight: 18, width: 170 }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="muted" style={{ padding: 32, textAlign: "center" }}>
                  No messages yet.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const name = r.template.startsWith("admin_") ? "Shop (admin)" : (r.order?.customerName ?? r.user?.name ?? "Customer");
              return (
                <tr key={r.id}>
                  <td className="num muted whitespace-nowrap" style={{ paddingLeft: 18 }}>
                    {formatListTime(r.createdAt)}
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span style={{ fontWeight: 650 }}>{name}</span>
                      <span className="small muted num">{formatLocalPhone(r.recipient)}</span>
                    </div>
                  </td>
                  <td className="small">{r.body}</td>
                  <td className="r" style={{ paddingRight: 18 }}>
                    {r.status === "sent" ? (
                      <span className="chip chip-ready">Sent</span>
                    ) : (
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={r.status === "failed" ? "chip chip-fail" : "chip chip-await"}>{r.status === "failed" ? "Failed" : "Not sent"}</span>
                        {r.error && (
                          <span className="muted" style={{ fontSize: 12 }}>
                            {r.error}
                          </span>
                        )}
                        {r.template !== "otp" && <ResendButton id={r.id} />}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
