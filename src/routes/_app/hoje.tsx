import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  Play,
  Repeat2,
  TrendingDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, Card, EmptyState, Field } from "@/components/pediflux/ui";
import { LogoMark } from "@/components/pediflux/Logo";
import { StatusBadge } from "@/components/pediflux/StatusBadge";
import { TYPE_STYLE } from "@/components/pediflux/typeStyle";
import { AppointmentDetailDialog, startAttendance } from "@/components/pediflux/appointments";
import { WhatsAppReminderDialog } from "@/components/pediflux/dialogs";
import { actions, useStore } from "@/data/store";
import type { Appointment, BookingRequest } from "@/data/types";
import {
  addDaysISO,
  firstName,
  formatAge,
  formatDate,
  formatLongDate,
  minToTime,
  parseISO,
  timeToMin,
  todayISO,
  weekdayShort,
} from "@/lib/age";
import { growthAlert } from "@/lib/growth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/hoje")({
  head: () => ({
    meta: [
      { title: "Hoje · PediFlux" },
      { name: "description", content: "Agenda do dia do pediatra." },
    ],
  }),
  component: TodayPage,
});

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_LONG = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function weekStart(iso: string) {
  const d = parseISO(iso).getDay();
  return addDaysISO(iso, d === 0 ? -6 : 1 - d);
}

function TodayPage() {
  const navigate = useNavigate();
  const settings = useStore((s) => s.settings);
  const appointments = useStore((s) => s.appointments);
  const patients = useStore((s) => s.patients);
  const requests = useStore((s) => s.requests);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [wa, setWa] = useState<Appointment | null>(null);
  const [suggest, setSuggest] = useState<BookingRequest | null>(null);

  const today = todayISO();
  const todays = useMemo(() => appointments.filter((a) => a.date === today), [appointments, today]);
  const next = todays.find((a) =>
    ["em_atendimento", "aguardando", "confirmado", "agendado"].includes(a.status),
  );
  const nextPatient = next ? patients.find((p) => p.id === next.patientId) : undefined;

  const alerts = useMemo(
    () =>
      patients
        .map((p) => ({ p, alert: growthAlert(p, "weight") ?? growthAlert(p, "height") }))
        .filter((x) => x.alert),
    [patients],
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Saudação */}
      <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm font-medium text-muted-foreground first-letter:uppercase">
            {formatLongDate(today)}
          </p>
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            {greeting()}, {settings.doctorShort}!
          </h1>
        </div>
        {next && nextPatient && (
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-card p-2 pr-2.5 shadow-soft">
            <span className="rounded-xl bg-gradient-brand px-3 py-2 text-sm font-extrabold text-white">
              {next.time}
            </span>
            <span className="min-w-0 text-sm">
              <span className="block text-xs text-muted-foreground">Próxima consulta</span>
              <b className="block truncate text-navy">{nextPatient.name}</b>
            </span>
            <Button size="sm" variant="teal" onClick={() => startAttendance(next, navigate)}>
              <Play /> {next.status === "em_atendimento" ? "Continuar" : "Atender"}
            </Button>
          </div>
        )}
      </div>

      {/* Linha 1: resumo do dia + calendário */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.15fr]">
        <DaySummary todays={todays} requests={requests.length} />
        <CalendarCard onOpen={setDetail} />
      </div>

      {/* Linha 2: gráficos */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MonthlyChart />
        <WeekBars />
        <OccupancyCard />
      </div>

      {/* Linha 3: pedidos + alertas */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between px-5 pt-5">
            <div>
              <h2 className="text-base font-bold">Pedidos de agendamento</h2>
              <p className="text-sm text-muted-foreground">Vindos do seu link público</p>
            </div>
            {requests.length > 0 && (
              <span className="rounded-full bg-orange/15 px-2.5 py-1 text-xs font-bold text-orange">
                {requests.length} pendentes
              </span>
            )}
          </div>
          {requests.length ? (
            <ul className="grid grid-cols-1 gap-3 p-5">
              {requests.map((r) => (
                <li key={r.id} className="rounded-2xl border border-border p-3.5">
                  <div className="flex items-start gap-3">
                    <Avatar name={r.childName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-navy">{r.childName}</p>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-xs font-bold text-teal">
                          <Clock className="h-3 w-3" /> {formatDate(r.date).slice(0, 5)} · {r.time}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatAge(r.childBirth)} · {r.guardianName}
                      </p>
                      <p className="mt-1 text-sm text-navy/80">{r.reason}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 pl-11">
                    <Button
                      size="sm"
                      variant="teal"
                      onClick={() => {
                        actions.confirmRequest(r.id);
                        toast.success("Consulta confirmada", {
                          description: `${r.childName} · ${formatDate(r.date)} às ${r.time}`,
                        });
                      }}
                    >
                      <Check /> Confirmar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setSuggest(r)}>
                      Outro horário
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Recusar pedido"
                      title="Recusar"
                      className="ml-auto h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        actions.rejectRequest(r.id);
                        toast("Pedido recusado");
                      }}
                    >
                      <X />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Inbox}
              title="Tudo respondido"
              text="Novos pedidos do link público aparecem aqui."
            />
          )}
        </Card>

        <Card>
          <div className="px-5 pt-5">
            <h2 className="text-base font-bold">Atenção no crescimento</h2>
            <p className="text-sm text-muted-foreground">Quedas de percentil detectadas</p>
          </div>
          {alerts.length ? (
            <ul className="grid grid-cols-1 gap-3 p-5">
              {alerts.map(({ p, alert }) => (
                <li key={p.id}>
                  <Link
                    to="/pacientes/$id"
                    params={{ id: p.id }}
                    search={{ aba: "crescimento" }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl p-3.5 transition hover:brightness-[0.98]",
                      alert!.level === "danger" ? "bg-rose" : "bg-peach",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-xl bg-card",
                        alert!.level === "danger" ? "text-destructive" : "text-orange",
                      )}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-navy">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {alert!.text}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={TrendingDown}
              title="Nenhum alerta"
              text="Todos crescendo dentro do esperado."
            />
          )}
        </Card>
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
      <SuggestDialog request={suggest} onClose={() => setSuggest(null)} />
    </div>
  );
}

/* ---------------- Resumo do dia (mascote ligado aos indicadores) ---------------- */
const TONE = {
  teal: { tile: "bg-teal/12 text-teal", bar: "bg-teal" },
  sky: { tile: "bg-sky text-info", bar: "bg-info" },
  orange: { tile: "bg-peach text-orange", bar: "bg-orange" },
  lavender: { tile: "bg-lavender text-[oklch(0.55_0.15_290)]", bar: "bg-[oklch(0.62_0.14_290)]" },
} as const;

function DaySummary({ todays, requests }: { todays: Appointment[]; requests: number }) {
  const patients = useStore((s) => s.patients);
  const today = todayISO();
  const done = todays.filter((a) => a.status === "atendido").length;
  const confirmed = todays.filter((a) =>
    ["confirmado", "aguardando", "em_atendimento", "atendido"].includes(a.status),
  ).length;
  const returns = patients.filter(
    (p) => p.nextReturn && p.nextReturn >= today && p.nextReturn <= addDaysISO(today, 30),
  ).length;
  const total = Math.max(todays.length, 1);

  const items = [
    {
      label: "Atendidas",
      value: `${done}/${todays.length}`,
      pct: done / total,
      icon: CheckCircle2,
      tone: "teal",
      to: "/agenda",
    },
    {
      label: "Confirmadas",
      value: `${confirmed}/${todays.length}`,
      pct: confirmed / total,
      icon: CalendarCheck2,
      tone: "sky",
      to: "/agenda",
    },
    {
      label: "Pedidos pendentes",
      value: String(requests),
      pct: Math.min(requests / 5, 1),
      icon: Inbox,
      tone: "orange",
      to: "/hoje",
    },
    {
      label: "Retornos em 30 dias",
      value: String(returns),
      pct: Math.min(returns / 10, 1),
      icon: Repeat2,
      tone: "lavender",
      to: "/pacientes",
    },
  ] as const;

  // Geometria do "hub": cartões de 72px com 12px de espaço; linhas partem do mascote
  const ROW = 84;
  const centers = items.map((_, i) => 36 + i * ROW);
  const H = centers[centers.length - 1]! + 36;
  const cx = 74;
  const cy = H / 2;
  const r = 60;
  const END_X = 172; // borda esquerda dos cartões (coluna 156px + gap 16px)

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">Resumo do dia</h2>
          <p className="text-sm text-muted-foreground">{todays.length} consultas na agenda</p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
          Hoje
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[156px_1fr]">
        <div className="relative hidden sm:block" style={{ height: H }}>
          <svg
            className="absolute inset-0 overflow-visible"
            width="156"
            height={H}
            aria-hidden="true"
          >
            {centers.map((y, i) => {
              const dx = END_X - cx;
              const dy = y - cy;
              const len = Math.hypot(dx, dy);
              const sx = cx + (dx / len) * (r + 4);
              const sy = cy + (dy / len) * (r + 4);
              return (
                <g key={i}>
                  <line
                    x1={sx}
                    y1={sy}
                    x2={END_X}
                    y2={y}
                    stroke="var(--orange)"
                    strokeOpacity="0.55"
                    strokeWidth="1.5"
                    strokeDasharray="3 4"
                  />
                  <circle
                    cx={sx}
                    cy={sy}
                    r="4"
                    fill="var(--card)"
                    stroke="var(--orange)"
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </svg>
          <div
            className="absolute grid place-items-center rounded-full bg-gradient-teal shadow-lift"
            style={{ left: cx - r, top: cy - r, width: r * 2, height: r * 2 }}
          >
            <span className="grid h-[84px] w-[84px] place-items-center rounded-full bg-white">
              <LogoMark className="h-16 w-16" />
            </span>
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-3">
          {items.map((it) => {
            const t = TONE[it.tone];
            return (
              <li key={it.label}>
                <Link
                  to={it.to}
                  className="flex h-[72px] items-center gap-3 rounded-2xl border border-border bg-card px-3.5 transition hover:border-teal/40 hover:shadow-soft"
                >
                  <span
                    className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", t.tile)}
                  >
                    <it.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-bold text-navy">{it.label}</span>
                      <span className="text-sm font-extrabold text-navy">{it.value}</span>
                    </span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn("block h-full rounded-full transition-all", t.bar)}
                        style={{ width: `${Math.round(it.pct * 100)}%` }}
                      />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

/* ---------------- Calendário (faixa da semana + cartões pastel) ---------------- */
function CalendarCard({ onOpen }: { onOpen: (a: Appointment) => void }) {
  const appointments = useStore((s) => s.appointments);
  const patients = useStore((s) => s.patients);
  const today = todayISO();
  const [selected, setSelected] = useState(today);
  const [week, setWeek] = useState(weekStart(today));
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(week, i));
  const list = appointments.filter((a) => a.date === selected);
  const shown = list.slice(0, 4);
  const month = parseISO(days[3]!);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold">Calendário</h2>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm font-semibold text-muted-foreground">
            {MONTHS_LONG[month.getMonth()]} {month.getFullYear()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setWeek(addDaysISO(week, -7))}
            aria-label="Semana anterior"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setWeek(addDaysISO(week, 7))}
            aria-label="Próxima semana"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const isSel = d === selected;
          const has = appointments.some((a) => a.date === d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelected(d)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-full py-2.5 transition",
                isSel
                  ? "bg-gradient-to-b from-teal to-[var(--brand-blue)] text-white shadow-lift"
                  : "hover:bg-muted",
              )}
            >
              <span className={cn("text-xs", isSel ? "text-white/85" : "text-muted-foreground")}>
                {weekdayShort(d)}
              </span>
              <span className={cn("text-lg font-extrabold", isSel ? "text-white" : "text-navy")}>
                {parseISO(d).getDate()}
              </span>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  has ? (isSel ? "bg-white" : "bg-orange") : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3">
        {shown.length ? (
          shown.map((a) => {
            const p = patients.find((x) => x.id === a.patientId);
            if (!p) return null;
            const st = TYPE_STYLE[a.type];
            return (
              <div key={a.id} className="grid grid-cols-[56px_1fr] items-center gap-3">
                <div className="text-sm font-bold text-navy">
                  {a.time}
                  <span className="block text-xs font-medium text-muted-foreground">
                    {minToTime(timeToMin(a.time) + a.duration)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(a)}
                  className={cn(
                    "flex min-w-0 items-center gap-3 rounded-2xl p-3 text-left transition hover:brightness-[0.98]",
                    st.bg,
                    a.status === "atendido" && "opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card shadow-soft",
                      st.tint,
                    )}
                  >
                    <st.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-navy">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.type} · {formatAge(p.birthDate)}
                    </span>
                  </span>
                  <StatusBadge status={a.status} className="hidden bg-card/70 sm:inline-flex" />
                </button>
              </div>
            );
          })
        ) : (
          <p className="rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground">
            Nenhuma consulta em {formatDate(selected)}.
          </p>
        )}
        {list.length > 0 && (
          <Link
            to="/agenda"
            className="justify-self-end text-xs font-semibold text-muted-foreground hover:text-teal"
          >
            {list.length > shown.length ? `Ver todas (${list.length})` : "Abrir agenda"} ›
          </Link>
        )}
      </div>
    </Card>
  );
}

/* ---------------- Atendimentos por mês (linha suave) ---------------- */
function MonthlyChart() {
  const consultations = useStore((s) => s.consultations);
  const data = useMemo(() => {
    const now = parseISO(todayISO());
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        label: MONTHS[d.getMonth()]!,
        total: consultations.filter((c) => c.date.startsWith(key)).length,
      };
    });
  }, [consultations]);
  const totalPeriod = data.reduce((acc, d) => acc + d.total, 0);

  return (
    <div className="rounded-[1.25rem] border border-orange/10 bg-peach/70 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold">Atendimentos</h2>
          <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
        </div>
        <span className="rounded-full bg-card px-3 py-1 text-xs font-bold text-orange shadow-soft">
          {totalPeriod} no período
        </span>
      </div>
      <div className="mt-3 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="pf-orange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--orange)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--orange)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="var(--muted-foreground)"
            />
            <Tooltip
              cursor={{ stroke: "var(--orange)", strokeOpacity: 0.3 }}
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="rounded-xl bg-card px-3 py-1.5 text-xs font-bold text-navy shadow-lift">
                    {payload[0].value} atendimentos
                  </div>
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--orange)"
              strokeWidth={2.5}
              fill="url(#pf-orange)"
              dot={false}
              activeDot={{ r: 5, fill: "var(--card)", stroke: "var(--orange)", strokeWidth: 2.5 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------------- Sua semana (barras) ---------------- */
function WeekBars() {
  const appointments = useStore((s) => s.appointments);
  const today = todayISO();
  const ws = weekStart(today);
  const days = Array.from({ length: 6 }, (_, i) => addDaysISO(ws, i));
  const counts = days.map((d) => appointments.filter((a) => a.date === d).length);
  const max = Math.max(...counts, 1);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold">Sua semana</h2>
          <p className="text-sm text-muted-foreground">Consultas por dia</p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
          Semana
        </span>
      </div>
      <div className="mt-4 flex h-36 items-end justify-between gap-3 px-1">
        {days.map((d, i) => {
          const isToday = d === today;
          const h = Math.max((counts[i]! / max) * 100, 6);
          return (
            <Link
              key={d}
              to="/agenda"
              className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
            >
              <span
                className={cn(
                  "text-[11px] font-bold",
                  isToday ? "text-orange" : "text-transparent group-hover:text-muted-foreground",
                )}
              >
                {counts[i]}
              </span>
              <span
                className={cn(
                  "w-full max-w-7 rounded-full transition",
                  isToday
                    ? "bg-orange shadow-[0_8px_18px_-6px_var(--orange)]"
                    : "bg-muted group-hover:bg-teal/30",
                )}
                style={{ height: `${h}%` }}
              />
              <span
                className={cn(
                  "text-[11px]",
                  isToday ? "font-bold text-navy" : "text-muted-foreground",
                )}
              >
                {weekdayShort(d)}
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------------- Ocupação de hoje (card teal) ---------------- */
function OccupancyCard() {
  const appointments = useStore((s) => s.appointments);
  const blocks = useStore((s) => s.blocks);
  const hours = useStore((s) => s.settings.hours);
  const today = todayISO();
  const h = hours[parseISO(today).getDay()];
  const open = h?.enabled ? timeToMin(h.end) - timeToMin(h.start) : 0;
  const blocked = blocks
    .filter((b) => b.date === today)
    .reduce((acc, b) => acc + timeToMin(b.end) - timeToMin(b.start), 0);
  const todays = appointments.filter((a) => a.date === today && a.status !== "faltou");
  const booked = todays.reduce((acc, a) => acc + a.duration, 0);
  const avail = Math.max(open - blocked, 1);
  const pct = Math.min(Math.round((booked / avail) * 100), 100);

  const spark = Array.from({ length: 11 }, (_, i) => {
    const hour = 8 + i;
    return {
      hour,
      n: todays.filter((a) => Math.floor(timeToMin(a.time) / 60) === hour).length,
    };
  });

  return (
    <div className="relative overflow-hidden rounded-[1.25rem] bg-gradient-teal p-5 text-white shadow-lift md:col-span-2 xl:col-span-1">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <h2 className="relative text-base font-bold !text-white">Ocupação de hoje</h2>
      <p className="relative text-sm text-white/80">
        {Math.round(booked / 60)}h agendadas de {Math.round(avail / 60)}h disponíveis
      </p>
      <div className="relative mt-2 h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={spark} margin={{ top: 8, right: 4, bottom: 4, left: 4 }}>
            <Line
              type="monotone"
              dataKey="n"
              stroke="white"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="relative text-5xl font-extrabold tracking-tight">
        {pct}
        <span className="ml-1 text-2xl font-semibold text-white/80">%</span>
      </p>
    </div>
  );
}

/* ---------------- Sugerir outro horário ---------------- */
function SuggestDialog({
  request,
  onClose,
}: {
  request: BookingRequest | null;
  onClose: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  useEffect(() => {
    if (request) {
      setDate(request.date);
      setTime(request.time);
    }
  }, [request]);
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sugerir outro horário</DialogTitle>
          <DialogDescription>
            Para {request?.childName} · {request ? firstName(request.guardianName) : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Hora">
            <Input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="brand"
            onClick={() => {
              if (!request) return;
              actions.confirmRequest(request.id, { date, time });
              toast.success("Novo horário confirmado", {
                description: `${formatDate(date)} às ${time}. Avise a família pelo WhatsApp.`,
              });
              onClose();
            }}
          >
            Confirmar novo horário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
