"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResendButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/notifications/${id}/resend`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(json.error ?? "Couldn’t resend.");
    if (json.status !== "sent") setMsg(json.error ?? "Still not sent.");
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-secondary btn-sm" type="button" onClick={resend} disabled={busy}>
        {busy ? "Sending…" : "Resend"}
      </button>
      {msg && (
        <span className="error-text" role="status">
          {msg}
        </span>
      )}
    </>
  );
}
