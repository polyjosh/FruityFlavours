"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";

const LEN = 6;

/** "Enter the code we sent" (design: Account-Mobile · SMS code). */
export function VerifyForm({ phoneLabel, purpose, resendIn: initialWait, testCode: initialTestCode }: { phoneLabel: string; purpose: "verify" | "reset"; resendIn: number; testCode: string | null }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [wait, setWait] = useState(initialWait);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [testCode, setTestCode] = useState(initialTestCode);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => inputs.current[0]?.focus(), []);

  const code = digits.join("");
  const complete = code.length === LEN && (purpose === "verify" || newPassword.length >= 8);

  function setAt(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    setDigits((prev) => prev.map((x, j) => (j === i ? d : x)));
    if (d && i < LEN - 1) inputs.current[i + 1]?.focus();
  }

  function onKey(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < LEN - 1) inputs.current[i + 1]?.focus();
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
    if (!text) return;
    e.preventDefault();
    setDigits(Array.from({ length: LEN }, (_, i) => text[i] ?? ""));
    inputs.current[Math.min(text.length, LEN - 1)]?.focus();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!complete) return;
    setBusy(true);
    setErrors({});
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, newPassword: purpose === "reset" ? newPassword : undefined }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErrors({ ...(json.fieldErrors ?? {}), form: json.fieldErrors ? undefined : json.error });
      setBusy(false);
      return;
    }
    router.push(json.next);
    router.refresh();
  }

  async function resend() {
    setNotice(null);
    const res = await fetch("/api/auth/resend", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (json.resendIn) setWait(json.resendIn);
    if (json.testCode) setTestCode(json.testCode);
    setNotice(res.ok ? "We sent a new code." : (json.error ?? "Couldn’t send a new code."));
  }

  const mmss = `0:${String(Math.max(wait, 0)).padStart(2, "0")}`;

  return (
    <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-[440px] flex-col gap-[18px] px-5 py-8">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full" style={{ background: "var(--green-soft)", color: "var(--green-text)" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5h16v11H9l-5 4z" />
          <path d="M8 10h8" />
        </svg>
      </div>
      <h1 className="h1">Enter the code we sent</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Sent by SMS to <strong style={{ color: "var(--text)" }}>{phoneLabel}</strong>.
      </p>

      {testCode && (
        <div className="notice notice-orange" role="note">
          <span>
            <strong>Test mode:</strong> SMS isn’t set up yet, so here is your code: <strong className="num" style={{ letterSpacing: ".12em" }}>{testCode}</strong>
          </span>
        </div>
      )}

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 8 }}>
          6-digit code
        </legend>
        <div className="flex gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              className="code"
              aria-label={`Digit ${i + 1}`}
              value={d}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => onKey(i, e)}
              onPaste={onPaste}
              aria-invalid={!!errors.code}
              aria-describedby={errors.code ? "code-err" : undefined}
            />
          ))}
        </div>
        {errors.code && (
          <p id="code-err" className="error-text mt-2">
            {errors.code}
          </p>
        )}
      </fieldset>

      {purpose === "reset" && (
        <div className="field">
          <label className="label" htmlFor="newPassword">
            New password
          </label>
          <input id="newPassword" className={errors.newPassword ? "input is-error" : "input"} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          {errors.newPassword ? <span className="error-text">{errors.newPassword}</span> : <span className="hint">At least 8 characters.</span>}
        </div>
      )}

      {errors.form && (
        <p className="notice notice-berry" role="alert">
          {errors.form}
        </p>
      )}
      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={!complete || busy}>
        {busy ? "Checking…" : "Verify and continue"}
      </button>
      <p className="small muted text-center" aria-live="polite">
        {notice ? `${notice} ` : ""}
        {wait > 0 ? (
          <>Didn’t get it? You can resend in {mmss}.</>
        ) : (
          <>
            Didn’t get it?{" "}
            <button type="button" className="link" onClick={resend} style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}>
              Send a new code
            </button>
          </>
        )}
      </p>
      <Link className="link small self-center p-2" href={purpose === "reset" ? "/account?mode=forgot" : "/account?mode=signup"}>
        Wrong number? Change it
      </Link>
    </form>
  );
}
