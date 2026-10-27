import { formatKES } from "@/lib/shared/money";

/** Bottles illustration from the design; stands in until a real hero photo is supplied. */
function HeroArt({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 300 170" aria-hidden="true">
      <circle cx="40" cy="140" r="34" fill="#f0992b" />
      <circle cx="262" cy="136" r="30" fill="#8cbf4a" />
      <path d="M88 20h22v16c0 6 14 12 14 30v92H74V66c0-18 14-24 14-30z" fill="#4f7f33" />
      <rect x="74" y="90" width="50" height="34" fill="#fff" opacity=".85" />
      <path d="M140 8h22v16c0 6 14 12 14 30v104h-50V54c0-18 14-24 14-30z" fill="#e0861c" />
      <rect x="126" y="84" width="50" height="38" fill="#fff" opacity=".85" />
      <path d="M192 24h22v16c0 6 14 12 14 30v88h-50V70c0-18 14-24 14-30z" fill="#a3304f" />
      <rect x="178" y="96" width="50" height="32" fill="#fff" opacity=".85" />
    </svg>
  );
}

export function Hero({ deliveryFee }: { deliveryFee: number }) {
  const fee = deliveryFee > 0 ? `for ${formatKES(deliveryFee)}` : "for free";
  return (
    <>
      {/* mobile */}
      <section className="flex flex-col gap-3.5 px-4 pb-2 pt-6 md:hidden">
        <p className="micro" style={{ color: "var(--orange-text)" }}>
          Fresh in Ongata Rongai
        </p>
        <h1 className="display">Mautamu Healthy.</h1>
        <p className="muted" style={{ fontSize: 17 }}>
          Cold-pressed juices, smoothies and cakes, made this morning. Delivered around Rongai or ready to pick up.
        </p>
        <div className="photo mt-1" style={{ height: 190, borderRadius: 20, background: "#ffd59a" }}>
          <HeroArt width={300} height={170} />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="tag" style={{ background: "var(--green-soft)", color: "var(--green-text)" }}>
            Pay with M-Pesa
          </span>
          <span className="tag">{deliveryFee > 0 ? `Delivery ${formatKES(deliveryFee)}` : "Free delivery"}</span>
          <span className="tag">Free pickup</span>
        </div>
      </section>

      {/* desktop */}
      <section className="wrap hidden grid-cols-2 items-center gap-12 py-14 md:grid">
        <div className="flex flex-col gap-5">
          <p className="micro" style={{ color: "var(--orange-text)" }}>
            Fresh in Ongata Rongai
          </p>
          <h1 className="display-lg">Mautamu Healthy.</h1>
          <p className="muted" style={{ fontSize: 19, maxWidth: 470 }}>
            Cold-pressed juices, smoothies and cakes, made this morning. Delivered around Rongai {fee}, or pick up for free.
          </p>
          <div className="mt-1.5 flex gap-3">
            <a className="btn btn-primary btn-lg" href="#menu">
              See today’s menu
            </a>
            <a className="btn btn-secondary btn-lg" href="#delivery">
              How delivery works
            </a>
          </div>
          <div className="mt-1 flex gap-2">
            <span className="tag" style={{ background: "var(--green-soft)", color: "var(--green-text)" }}>
              Pay with M-Pesa
            </span>
            <span className="tag">Pressed daily</span>
            <span className="tag">No added sugar</span>
          </div>
        </div>
        <div className="photo" style={{ height: 400, borderRadius: 24, background: "#ffd59a" }}>
          <HeroArt width={460} height={300} />
        </div>
      </section>
    </>
  );
}
