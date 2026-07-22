"use client";

import { useState, type ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: "amber" | "sky" | "emerald" | "slate";
  defaultOpen?: boolean;
  children: ReactNode;
};

const badgeColors = {
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  sky: "bg-sky-100 text-sky-800 border-sky-200",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};

export function CollapsibleSection({
  title,
  subtitle,
  badge,
  badgeColor = "amber",
  defaultOpen = true,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-[2rem] border border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur transition-all">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 p-6 text-left sm:p-8"
      >
        <div className="flex min-w-0 items-center gap-4">
          <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {title}
          </h2>
          {badge && (
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${badgeColors[badgeColor]}`}
            >
              {badge}
            </span>
          )}
        </div>
        <span
          className={`shrink-0 text-2xl text-slate-400 transition-transform duration-300 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          ⌄
        </span>
      </button>

      {subtitle && (
        <div
          className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
            open ? "max-h-[60px]" : "max-h-0"
          }`}
        >
          <div className="px-6 pb-2 sm:px-8">
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
      )}

      <div
        className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          open ? "max-h-[8000px]" : "max-h-0"
        }`}
      >
        <div className="border-t border-slate-100 px-6 pb-8 pt-6 sm:px-8">
          {children}
        </div>
      </div>
    </section>
  );
}
