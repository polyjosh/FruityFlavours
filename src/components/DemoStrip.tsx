import { isLocalDb } from "@/lib/server/db";

/** Shown while the app runs on the local development database (no DATABASE_URL). */
export function DemoStrip() {
  if (!isLocalDb()) return null;
  return (
    <p className="small" style={{ background: "var(--orange-soft)", color: "var(--orange-text)", textAlign: "center", padding: "8px 16px" }}>
      Test mode: local database with sample data. Orders here are not real.
    </p>
  );
}
