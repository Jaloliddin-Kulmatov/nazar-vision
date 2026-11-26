import { site } from "@/config/site";

/** Eye inside detector corner-brackets. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path d="M3 9V3h6M23 3h6v6M29 23v6h-6M9 29H3v-6" stroke="var(--cyan)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M6 16c2.8-4.6 6.2-7 10-7s7.2 2.4 10 7c-2.8 4.6-6.2 7-10 7s-7.2-2.4-10-7Z" stroke="var(--text)" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="3.4" fill="var(--cyan)" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[17px] font-bold">
        {site.name.split(" ")[0]}
        <span className="text-muted"> {site.name.split(" ").slice(1).join(" ")}</span>
      </span>
    </span>
  );
}
