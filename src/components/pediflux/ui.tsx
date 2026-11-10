import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/age";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("card-surface", className)}>{children}</section>;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-teal">
            <Icon className="h-4.5 w-4.5" />
          </span>
        )}
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "teal",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: "teal" | "warning" | "blue";
}) {
  const t = {
    teal: "bg-teal/10 text-teal",
    warning: "bg-warning/15 text-warning",
    blue: "bg-info/10 text-info",
  }[tone];
  return (
    <Card className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <span
        className={cn("grid h-10 w-10 shrink-0 sm:h-12 sm:w-12 place-items-center rounded-xl", t)}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-extrabold text-navy">{value}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}
    >
      <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-teal">
        <Icon className="h-7 w-7" />
      </span>
      <p className="font-bold text-navy">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Avatar({
  name,
  sex,
  size = "md",
}: {
  name: string;
  sex?: "M" | "F";
  size?: "sm" | "md" | "lg";
}) {
  const s = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" }[size];
  const tone =
    sex === "F"
      ? "bg-teal/15 text-teal"
      : sex === "M"
        ? "bg-info/12 text-info"
        : "bg-gradient-brand text-primary-foreground";
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full font-bold", s, tone)}>
      {initials(name)}
    </span>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1.5 text-sm font-medium text-navy", className)}>
      {label}
      {children}
    </label>
  );
}
