import type { ComponentProps, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function Container({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function Section({
  className = "",
  children,
  id,
}: {
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={`py-16 sm:py-24 ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

/** Small context line above a page title (sentence case, no decoration). */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-sm font-medium text-cyan">{children}</p>;
}

export function SectionHeader({
  title,
  subtitle,
  center = false,
  as: Tag = "h2",
}: {
  /** Accepted for older call sites; section titles stand on their own now. */
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  center?: boolean;
  as?: "h1" | "h2";
}) {
  return (
    <div className={`mb-10 max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      <Tag
        className={`font-display font-bold text-balance ${
          Tag === "h1" ? "text-[2rem] leading-[1.08] sm:text-5xl" : "text-[1.75rem] leading-tight sm:text-4xl"
        }`}
      >
        {title}
      </Tag>
      {subtitle && <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg text-pretty">{subtitle}</p>}
    </div>
  );
}

type LinkProps = ComponentProps<typeof Link>;

export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  arrow,
  ...props
}: LinkProps & { variant?: "primary" | "ghost"; arrow?: boolean }) {
  const styles =
    variant === "primary"
      ? "bg-cyan text-bg hover:bg-cyan-hi"
      : "border border-line-strong text-text hover:border-text";
  return (
    <Link
      {...props}
      className={`inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-center text-[15px] font-semibold transition-colors ${styles} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`min-w-0 rounded-xl border border-line bg-panel/60 p-6 ${className}`}>{children}</div>;
}

export function PageHero({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  const c = useTranslations("common");
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="bg-grid absolute inset-0 opacity-70" aria-hidden="true" />
      <Container className="relative pb-12 pt-10 sm:pb-16 sm:pt-14">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-sm text-dim">
          <Link href="/" className="hover:text-text">
            {c("home")}
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="text-muted" aria-current="page">
            {eyebrow}
          </span>
        </nav>
        <SectionHeader as="h1" title={title} subtitle={subtitle} />
      </Container>
    </section>
  );
}
