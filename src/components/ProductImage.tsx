import Image from "next/image";

interface Props {
  name: string;
  photo: string | null;
  emoji: string | null;
  color: string | null;
  greyscale?: boolean;
  /** "card" fills the width; a number makes a square thumbnail of that size. */
  size?: "card" | number;
  className?: string;
  style?: React.CSSProperties;
}

/** Uploaded photo, or the product's emoji on its fallback colour when there is no photo yet. */
export function ProductImage({ name, photo, emoji, color, greyscale, size = "card", className = "", style }: Props) {
  const thumb = typeof size === "number";
  const box: React.CSSProperties = thumb
    ? { width: size, height: size, borderRadius: size >= 72 ? 12 : 10, flex: "none", ...style }
    : { ...style };
  const cls = `photo ${greyscale ? "is-grey" : ""} ${className}`;

  if (photo) {
    return (
      <div className={cls} style={box}>
        <Image src={photo} alt={name} fill sizes={thumb ? `${size}px` : "(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"} className="object-cover" />
      </div>
    );
  }
  return (
    <div className={cls} style={{ background: color ?? "var(--surface-2)", ...box }} aria-hidden="true">
      <span style={{ fontSize: thumb ? Math.round((size as number) * 0.5) : 76, lineHeight: 1, opacity: greyscale ? 0.55 : 1 }}>{emoji ?? "🍹"}</span>
    </div>
  );
}
