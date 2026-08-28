"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Documents and money are deliberately separate destinations: raising an
// invoice and reconciling the month are different jobs.
const tabs = [
  { href: "/", label: "Home" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
  { href: "/mou", label: "MOUs" },
  { href: "/money", label: "Money" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-paper border-t border-line pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-4xl mx-auto grid grid-cols-5">
        {tabs.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`py-3 text-center text-xs sm:text-sm font-semibold ${
                active ? "text-navy border-t-2 border-blue-bright -mt-px" : "text-mute"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
