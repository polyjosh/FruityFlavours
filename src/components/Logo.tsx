import Link from "next/link";

/** Script wordmark (public/logo.png). ff.css renders it white in dark mode via .logo. */
export function LogoImage({ width, className }: { width: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`logo ${className ?? ""}`} src="/logo.png" alt="FruityFlavours" width={width} height={Math.round((width * 402) / 520)} style={{ width }} />;
}

export function Logo({ width, className }: { width: number; className?: string }) {
  return (
    <Link href="/" aria-label="FruityFlavours home" className={className}>
      <LogoImage width={width} />
    </Link>
  );
}
