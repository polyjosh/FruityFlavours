"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LogoImage } from "@/components/Logo";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.fieldErrors?.password ?? json.error ?? "Couldn’t sign in.");
      setBusy(false);
      return;
    }
    router.push(json.next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="flex w-full max-w-[380px] flex-col gap-[18px]">
      <LogoImage width={120} className="md:hidden" />
      <div>
        <h1 className="h1">Admin sign in</h1>
        <p className="muted">Staff only. Enter the admin password.</p>
      </div>
      <div className="field">
        <label className="label" htmlFor="ap">
          Password
        </label>
        <div className="relative">
          <input
            id="ap"
            className={error ? "input is-error" : "input"}
            type={shown ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingRight: 150 }}
            aria-invalid={!!error}
            aria-describedby={error ? "ae" : undefined}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-pressed={shown}
            style={{ position: "absolute", right: 4, top: 4, height: 40, padding: "0 12px", border: 0, borderRadius: 8, background: "transparent", color: "var(--green-text)", font: "inherit", fontWeight: 650, fontSize: 14, cursor: "pointer" }}
          >
            {shown ? "Hide" : "Show"} password
          </button>
        </div>
        {error && (
          <span className="error-text" id="ae" role="alert">
            {error}
          </span>
        )}
      </div>
      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy || !password}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="small muted">Forgot it? The owner can reset it from the server settings.</p>
    </form>
  );
}
