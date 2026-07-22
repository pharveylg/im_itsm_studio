"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TopNavProps = {
  configured: boolean;
  instanceUrl: string | null;
};

const ITEMS = [
  { href: "/", label: "Workbench" },
  { href: "/knowledge", label: "Knowledge Authoring" },
  { href: "/settings", label: "Settings" },
];

export function TopNav({ configured, instanceUrl }: TopNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-pine shadow-sm transition-transform duration-300 group-hover:-rotate-6">
            <svg viewBox="0 0 20 20" className="size-4.5" aria-hidden="true">
              <path
                d="M3 11.5c2.2-4.6 5-6.8 8.2-7.2-1.6 2.3-2.5 4.4-2.7 6.3 2.4-.4 4.7.2 6.5 1.9-2.9 3.4-7.6 4.6-12 2.5L3 11.5Z"
                fill="#43c463"
              />
            </svg>
          </span>
          <span className="font-display text-[15px] font-bold tracking-tight text-ink">
            ITSM<span className="text-leaf-deep"> Service Delivery</span>
          </span>
          <span className="hidden font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ink/40 sm:block">
            Analysis Studio
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
                  active
                    ? "bg-pine text-paper shadow-sm"
                    : "text-ink/65 hover:bg-mist hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span
            className={`hidden items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] font-medium sm:flex ${
              configured
                ? "border-leaf/50 bg-leaf-soft text-leaf-deep"
                : "border-ember/50 bg-amber-50 text-amber-700"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                configured ? "bg-leaf dot-live" : "bg-ember"
              }`}
            />
            {configured ? "LINK PREPARED" : "LINK NOT PREPARED"}
          </span>
          {configured && instanceUrl && (
            <span className="hidden max-w-[220px] truncate font-mono text-[11px] text-ink/50 lg:block">
              {instanceUrl.replace(/^https:\/\//, "")}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
