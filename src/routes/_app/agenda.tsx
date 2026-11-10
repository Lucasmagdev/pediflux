import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Link2,
  Lock,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, Field, PageHeader } from "@/components/pediflux/ui";
import { STATUS_META, TONE_BLOCK } from "@/components/pediflux/StatusBadge";
import { AppointmentDetailDialog } from "@/components/pediflux/appointments";
import { WhatsAppReminderDialog } from "@/components/pediflux/dialogs";
import { actions, useStore } from "@/data/store";
import type { Appointment, TimeBlock } from "@/data/types";
import {
  addDaysISO,
  firstName,
  formatDate,
  minToTime,
  parseISO,
  timeToMin,
  todayISO,
  weekdayShort,
} from "@/lib/age";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda · PediFlux" },
      { name: "description", content: "Agenda de consultas do consultório." },
    ],
  }),
  component: AgendaPage,
});

const START = 7 * 60;
const END = 19 * 60;
const SLOT = 30;
const PX_PER_MIN = 1.6;
const SLOTS = Array.from({ length: (END - START) / SLOT }, (_, i) => START + i * SLOT);
const MONTHS_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function weekStart(iso: string) {
  const d = parseISO(iso).getDay();
  return addDaysISO(iso, d === 0 ? -6 : 1 - d);
}

function AgendaPage() {
  const [view, setView] = useState<"dia" | "semana">("dia");
  const [date, setDate] = useState(todayISO());
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [wa, setWa] = useState<Appointment | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const appointments = useStore((s) => s.appointments);
  const blocks = useStore((s) => s.blocks);
  const patients = useStore((s) => s.patients);
  const settings = useStore((s) => s.settings);

  const days = useMemo(() => {
    if (view === "dia") return [date];
    const ws = weekStart(date);
    return Array.from({ length: 6 }, (_, i) => addDaysISO(ws, i));
  }, [view, date]);

  const step = view === "dia" ? 1 : 7;
  const rangeLabel =
    view === "dia"
      ? `${weekdayShort(date)}, ${formatDate(date)}`
      : `${parseISO(days[0]).getDate()} ${MONTHS_SHORT[parseISO(days[0]).getMonth()]} – ${parseISO(days[5]).getDate()} ${MONTHS_SHORT[parseISO(days[5]).getMonth()]}`;

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/agendar/${settings.slug}`
      : `/agendar/${settings.slug}`;
  const countDay = appointments.filter((a) => days.includes(a.date)).length;

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle={`${countDay} consultas ${view === "dia" ? "neste dia" : "nesta semana"} · clique num horário livre para agendar`}
        actions={
          <>
            <Button variant="outline" onClick={() => setBlockOpen(true)}>
              <Ban /> Bloquear horário
            </Button>
            <Button variant="brand" onClick={() => actions.openNewAppt({ date })}>
              <Plus /> Nova consulta
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
        <Card className="overflow-hidden">
          {/* Barra de navegação */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setDate(addDaysISO(date, -step))}
                aria-label="Anterior"
              >
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDate(todayISO())}>
                Hoje
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setDate(addDaysISO(date, step))}
                aria-label="Próximo"
              >
                <ChevronRight />
              </Button>
            </div>
            <p className="font-bold first-letter:uppercase text-navy">{rangeLabel}</p>
            <Input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="hidden h-9 w-auto sm:block"
              aria-label="Ir para data"
            />
            <div className="ml-auto inline-flex rounded-xl bg-muted p-1">
              {(["dia", "semana"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-semibold first-letter:uppercase transition",
                    view === v
                      ? "bg-card text-navy shadow-soft"
                      : "text-muted-foreground hover:text-navy",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Grade */}
          <div className="overflow-x-auto">
            <div className={cn("relative", view === "semana" && "min-w-[860px]")}>
              {/* Cabeçalho dos dias (só na semana; na visão dia a data já está na barra) */}
              {view === "semana" && (
                <div
                  className="sticky top-0 z-10 grid border-b border-border bg-card"
                  style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}
                >
                  <div />
                  {days.map((d) => {
                    const isToday = d === todayISO();
                    const n = appointments.filter((a) => a.date === d).length;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setDate(d);
                          setView("dia");
                        }}
                        className="flex flex-col items-center gap-0.5 border-l border-border py-2 hover:bg-muted/50"
                      >
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                          {weekdayShort(d)}
                        </span>
                        <span
                          className={cn(
                            "grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold",
                            isToday ? "bg-teal text-white" : "text-navy",
                          )}
                        >
                          {parseISO(d).getDate()}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{n} consultas</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div
                className="grid pt-3"
                style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}
              >
                {/* Horários */}
                <div className="relative">
                  {SLOTS.map((m) => (
                    <div
                      key={m}
                      className="relative border-b border-transparent"
                      style={{ height: SLOT * PX_PER_MIN }}
                    >
                      {m % 60 === 0 && (
                        <span className="absolute -top-2 right-2 text-xs font-medium text-muted-foreground">
                          {minToTime(m)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {days.map((d) => (
                  <DayColumn
                    key={d}
                    date={d}
                    compact={view === "semana"}
                    appointments={appointments.filter((a) => a.date === d)}
                    blocks={blocks.filter((b) => b.date === d)}
                    patientName={(id) => patients.find((p) => p.id === id)?.name ?? "—"}
                    onOpen={setDetail}
                    hours={settings.hours[parseISO(d).getDay()]}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Lateral */}
        <div className="grid grid-cols-1 content-start gap-6">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-white">
                <Link2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-navy">Link de agendamento</p>
                <p className="text-xs text-muted-foreground">Envie para as famílias marcarem</p>
              </div>
            </div>
            <div className="mt-4 truncate rounded-xl bg-muted px-3 py-2.5 font-mono text-xs text-navy">
              {publicUrl.replace(/^https?:\/\//, "")}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                variant="teal"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(publicUrl);
                  toast.success("Link copiado!");
                }}
              >
                <Copy /> Copiar
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/agendar/${settings.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink /> Abrir
                </a>
              </Button>
            </div>
          </Card>

          {view === "dia" && (
            <Card className="p-5">
              <p className="mb-3 font-bold text-navy">Bloqueios do dia</p>
              {blocks.filter((b) => days.includes(b.date)).length ? (
                <ul className="grid gap-2">
                  {blocks
                    .filter((b) => days.includes(b.date))
                    .map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
                      >
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="flex-1">
                          <b className="text-navy">{b.label}</b> · {weekdayShort(b.date)} {b.start}–
                          {b.end}
                        </span>
                        <button
                          type="button"
                          className="text-xs font-semibold text-destructive hover:underline"
                          onClick={() => {
                            actions.removeBlock(b.id);
                            toast("Bloqueio removido");
                          }}
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum bloqueio.</p>
              )}
            </Card>
          )}
        </div>
      </div>

      <AppointmentDetailDialog
        appointment={detail}
        onOpenChange={(o) => !o && setDetail(null)}
        onWhatsApp={(a) => {
          setDetail(null);
          setWa(a);
        }}
      />
      <WhatsAppReminderDialog appointment={wa} onOpenChange={(o) => !o && setWa(null)} />
      <BlockDialog open={blockOpen} onOpenChange={setBlockOpen} defaultDate={date} />
    </div>
  );
}

function DayColumn({
  date,
  appointments,
  blocks,
  patientName,
  onOpen,
  compact,
  hours,
}: {
  date: string;
  appointments: Appointment[];
  blocks: TimeBlock[];
  patientName: (id: string) => string;
  onOpen: (a: Appointment) => void;
  compact: boolean;
  hours: { enabled: boolean; start: string; end: string } | undefined;
}) {
  const open = hours?.enabled ? [timeToMin(hours.start), timeToMin(hours.end)] : null;
  const isToday = date === todayISO();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="relative border-l border-border">
      {SLOTS.map((m) => {
        const closed = !open || m < open[0]! || m >= open[1]!;
        return (
          <button
            key={m}
            type="button"
            onClick={() => actions.openNewAppt({ date, time: minToTime(m) })}
            className={cn(
              "group block w-full border-b text-left transition",
              m % 60 === 0 ? "border-border" : "border-dashed border-border/60",
              closed ? "bg-muted/40" : "hover:bg-teal/5",
            )}
            style={{ height: SLOT * PX_PER_MIN }}
            aria-label={`Agendar ${formatDate(date)} às ${minToTime(m)}`}
          >
            <span className="hidden px-2 text-xs font-semibold text-teal group-hover:inline">
              + {minToTime(m)}
            </span>
          </button>
        );
      })}

      {blocks.map((b) => {
        const top = (timeToMin(b.start) - START) * PX_PER_MIN;
        const h = (timeToMin(b.end) - timeToMin(b.start)) * PX_PER_MIN;
        return (
          <div
            key={b.id}
            className="pointer-events-none absolute inset-x-1 flex items-start gap-1 rounded-lg border border-border bg-card bg-[repeating-linear-gradient(135deg,var(--muted)_0_8px,transparent_8px_16px)] px-2 py-1 text-xs font-semibold text-muted-foreground"
            style={{ top, height: h }}
          >
            <Lock className="mt-0.5 h-3 w-3" /> {b.label}
          </div>
        );
      })}

      {appointments.map((a) => {
        const top = (timeToMin(a.time) - START) * PX_PER_MIN;
        const h = Math.max(a.duration * PX_PER_MIN - 3, 26);
        const tone = STATUS_META[a.status].tone;
        const name = patientName(a.patientId);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onOpen(a)}
            className={cn(
              "absolute inset-x-1 overflow-hidden rounded-lg border border-l-4 border-border/60 px-2 py-1 text-left shadow-soft transition hover:z-10 hover:shadow-lift",
              TONE_BLOCK[tone],
              a.status === "faltou" && "line-through decoration-destructive/50",
            )}
            style={{ top: top + 1, height: h }}
          >
            <p className="truncate text-xs font-bold text-navy">
              {a.time} · {compact ? firstName(name) : name}
            </p>
            {h > 40 && (
              <p className="truncate text-[11px] text-muted-foreground">
                {compact ? a.type : `${a.type} · ${a.reason}`}
              </p>
            )}
          </button>
        );
      })}

      {isToday && nowMin > START && nowMin < END && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
          style={{ top: (nowMin - START) * PX_PER_MIN }}
        >
          <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-destructive" />
          <span className="h-0.5 flex-1 bg-destructive" />
        </div>
      )}
    </div>
  );
}

function BlockDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultDate: string;
}) {
  const [f, setF] = useState({ date: defaultDate, start: "12:00", end: "13:00", label: "Almoço" });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setF((x) => ({ ...x, date: defaultDate }));
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
          <DialogDescription>Folga, almoço, reunião ou compromisso pessoal.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Motivo">
            <Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
          </Field>
          <Field label="Data">
            <Input
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início">
              <Input
                type="time"
                step={900}
                value={f.start}
                onChange={(e) => setF({ ...f, start: e.target.value })}
              />
            </Field>
            <Field label="Fim">
              <Input
                type="time"
                step={900}
                value={f.end}
                onChange={(e) => setF({ ...f, end: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Almoço", "Folga", "Reunião", "Congresso"].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setF({ ...f, label: l })}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  f.label === l
                    ? "border-teal bg-teal/10 text-teal"
                    : "border-border text-muted-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="brand"
            onClick={() => {
              if (timeToMin(f.end) <= timeToMin(f.start)) {
                toast.error("O fim precisa ser depois do início");
                return;
              }
              actions.addBlock(f);
              toast.success("Horário bloqueado", {
                description: `${formatDate(f.date)} · ${f.start}–${f.end}`,
              });
              onOpenChange(false);
            }}
          >
            Bloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
