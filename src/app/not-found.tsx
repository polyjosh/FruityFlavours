import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3.5 px-6 text-center">
      <Logo width={110} />
      <h1 className="h1 mt-4">We can’t find that page</h1>
      <p className="muted">It may have moved, or the link is wrong.</p>
      <Link href="/" className="btn btn-primary btn-lg mt-2">
        Browse the shop
      </Link>
    </main>
  );
}
