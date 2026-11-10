import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/data/types";

export const STATUS_META: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  agendado: { label: "Agendado", tone: "neutral" },
  confirmado: { label: "Confirmado", tone: "success" },
  aguardando: { label: "Aguardando", tone: "warning" },
  em_atendimento: { label: "Em atendimento", tone: "info" },
  atendido: { label: "Atendido", tone: "done" },
  faltou: { label: "Faltou", tone: "danger" },
};

export const STATUS_ORDER: AppointmentStatus[] = [
  "agendado",
  "confirmado",
  "aguardando",
  "em_atendimento",
  "atendido",
  "faltou",
];

export type Tone = "neutral" | "success" | "warning" | "info" | "danger" | "done" | "teal";

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/15 text-warning border-warning/30",
  info: "bg-info/10 text-info border-info/25",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  done: "bg-navy/8 text-navy border-navy/15",
  teal: "bg-teal/10 text-teal border-teal/25",
};

/** Bloco de agenda colorido por status */
export const TONE_BLOCK: Record<Tone, string> = {
  neutral: "bg-card border-l-muted-foreground/50",
  success: "bg-success/10 border-l-success",
  warning: "bg-warning/12 border-l-warning",
  info: "bg-info/10 border-l-info",
  danger: "bg-destructive/8 border-l-destructive",
  done: "bg-muted border-l-navy/40",
  teal: "bg-teal/10 border-l-teal",
};

export function Pill({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <Pill tone={m.tone} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </Pill>
  );
}
