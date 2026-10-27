import { SOCIAL_LABELS, socialUrl, type SocialKey, type SocialLinks } from "@/lib/shared/social";
import type { PickupPointView } from "@/lib/shared/types";
import { formatKES } from "@/lib/shared/money";
import { LogoImage } from "./Logo";
import { SOCIAL_ICONS } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  socials: SocialLinks;
  pickupPoints: PickupPointView[];
  deliveryFee: number;
}

export function SiteFooter({ socials, pickupPoints, deliveryFee }: Props) {
  const links = (Object.keys(SOCIAL_LABELS) as SocialKey[])
    .map((key) => ({ key, href: socialUrl(key, socials[key]) }))
    .filter((l): l is { key: SocialKey; href: string } => Boolean(l.href));
  const hours = [...new Set(pickupPoints.map((p) => p.openingHours).filter(Boolean))];
  const year = new Date().getFullYear();

  return (
    <footer style={{ borderTop: "1px solid var(--line)", background: "var(--surface)" }}>
      <div className="wrap grid gap-10 pb-8 pt-7 md:grid-cols-[1.4fr_1fr_1fr] md:pb-10 md:pt-12">
        <div className="flex flex-col gap-3.5 md:gap-3">
          <LogoImage width={110} className="md:hidden" />
          <LogoImage width={140} className="hidden md:block" />
          <p className="h3">Mautamu Healthy.</p>
          <p className="small muted md:hidden">Fresh juices, smoothies and cakes from Ongata Rongai, Kenya.</p>
          {links.length > 0 && (
            <nav className="mt-1 flex flex-wrap gap-2" aria-label="Social media">
              {links.map(({ key, href }) => {
                const Icon = SOCIAL_ICONS[key];
                return (
                  <a key={key} className="icon-btn" href={href} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_LABELS[key]}>
                    <Icon />
                  </a>
                );
              })}
            </nav>
          )}
        </div>
        <div className="hidden flex-col gap-2 md:flex">
          <h2 className="micro muted">Pick up from</h2>
          {pickupPoints.map((p) => (
            <p key={p.id}>{p.name}</p>
          ))}
          {hours.map((h) => (
            <p key={h} className="small muted">
              {h}
            </p>
          ))}
        </div>
        <div id="delivery" className="hidden scroll-mt-6 flex-col gap-2 md:flex">
          <h2 className="micro muted">Delivery</h2>
          <p>Around Ongata Rongai</p>
          <p>{deliveryFee > 0 ? `Flat fee ${formatKES(deliveryFee)}` : "Free delivery"}</p>
          <p className="small muted">Pay with M-Pesa or on delivery</p>
        </div>
      </div>
      <div className="wrap flex flex-wrap items-center justify-between gap-2 pb-28 pt-4 md:pb-6" style={{ borderTop: "1px solid var(--line)" }}>
        <p className="muted" style={{ fontSize: 13 }}>
          © {year} FruityFlavours · Ongata Rongai, Kenya
        </p>
        <ThemeToggle />
      </div>
    </footer>
  );
}
