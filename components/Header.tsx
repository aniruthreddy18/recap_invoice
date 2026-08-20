import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/actions";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 bg-navy text-white">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/logo-wordmark.png" alt="RecapReels" width={274} height={87} className="h-10 w-auto" priority />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/settings" className="rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10">
            Settings
          </Link>
          <form action={logout}>
            <button className="rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 cursor-pointer">
              Lock
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
