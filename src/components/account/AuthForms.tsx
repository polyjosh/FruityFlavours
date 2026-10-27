"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

type Mode = "login" | "signup" | "forgot";
type Errors = Record<string, string | undefined>;

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

/** Log in · Create account · Forgot password (design: Account-Mobile / Account-Desktop). */
export function AuthForms({ initial }: { initial: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initial);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  function switchTo(m: Mode) {
    setMode(m);
    setErrors({});
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const { ok, json } =
      mode === "login"
        ? await post("/api/auth/login", { phone, password, remember })
        : mode === "signup"
          ? await post("/api/auth/signup", { name, phone, password })
          : await post("/api/auth/forgot", { phone });
    if (!ok) {
      setErrors({ ...(json.fieldErrors ?? {}), form: json.fieldErrors ? undefined : (json.error ?? "Something went wrong. Please try again.") });
      setBusy(false);
      return;
    }
    router.push(json.next);
    router.refresh();
  }

  const heading: Record<Mode, [string, string]> = {
    login: ["Karibu tena!", "Log in to see your orders and reorder in one tap."],
    signup: ["Create your account", "Save your address, track orders and get updates by SMS."],
    forgot: ["Reset your password", "We’ll SMS a 6-digit code to your phone number."],
  };

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-[18px] px-5 py-7 md:py-12">
      {mode !== "forgot" && (
        <div className="seg" role="group" aria-label="Log in or sign up">
          <button type="button" className={mode === "login" ? "on" : ""} aria-pressed={mode === "login"} onClick={() => switchTo("login")}>
            Log in
          </button>
          <button type="button" className={mode === "signup" ? "on" : ""} aria-pressed={mode === "signup"} onClick={() => switchTo("signup")}>
            Create account
          </button>
        </div>
      )}
      <h1 className="h1">{heading[mode][0]}</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        {heading[mode][1]}
      </p>

      <form onSubmit={submit} noValidate className="flex flex-col gap-[18px]">
        {mode === "signup" && (
          <Field id="name" label="Your name" error={errors.name}>
            <input id="name" className={errors.name ? "input is-error" : "input"} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} />
          </Field>
        )}
        <Field id="phone" label="Phone number" error={errors.phone} hint={mode === "signup" ? "Use your M-Pesa number. We’ll text a 6-digit code to check it." : undefined}>
          <div className="input-group">
            <span className="prefix">+254</span>
            <input id="phone" className={errors.phone ? "input is-error" : "input"} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-err" : mode === "signup" ? "phone-hint" : undefined} />
          </div>
        </Field>
        {mode !== "forgot" && (
          <Field id="password" label="Password" error={errors.password} hint={mode === "signup" ? "At least 8 characters." : undefined}>
            <input id="password" className={errors.password ? "input is-error" : "input"} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-err" : mode === "signup" ? "password-hint" : undefined} />
          </Field>
        )}
        {mode === "login" && (
          <label className="check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Keep me logged in on this phone
          </label>
        )}
        {errors.form && (
          <p className="notice notice-berry" role="alert">
            {errors.form}
          </p>
        )}
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
          {busy ? "One moment…" : mode === "login" ? "Log in" : "Send me a code"}
        </button>
      </form>

      {mode === "login" && (
        <button type="button" className="link small self-center p-2" onClick={() => switchTo("forgot")} style={{ background: "none", border: 0, cursor: "pointer" }}>
          Forgot password? We’ll SMS you a code
        </button>
      )}
      {mode === "signup" && (
        // [PLACEHOLDER] No terms page yet; the design links "terms" here.
        <p className="small muted text-center">By signing up you agree to our terms.</p>
      )}
      {mode === "forgot" && (
        <button type="button" className="link small self-center p-2" onClick={() => switchTo("login")} style={{ background: "none", border: 0, cursor: "pointer" }}>
          Back to log in
        </button>
      )}
    </div>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="error-text" id={`${id}-err`}>
          {error}
        </span>
      )}
    </div>
  );
}
