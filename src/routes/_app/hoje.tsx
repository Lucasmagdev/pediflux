import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  Inbox,
  MessageCircle,
  Play,
  Repeat2,
  TrendingDown,
  UserPlus,
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
import { Avatar, Card, CardHeader, EmptyState, Field, StatCard } from "@/components/pediflux/ui";
import { LogoMark } from "@/components/pediflux/Logo";
import { Pill } from "@/components/pediflux/StatusBadge";
import {
  AppointmentDetailDialog,
  StatusSelect,
  startAttendance,
} from "@/components/pediflux/appointments";
import { WhatsAppReminderDialog } from "@/components/pediflux/dialogs";
import { actions, useStore } from "@/data/store";
import type { Appointment, BookingRequest } from "@/data/types";
import {
  addDaysISO,
  daysBetween,
  firstName,
  formatAge,
  formatDate,
  formatLongDate,
  todayISO,
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

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
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
  const done = todays.filter((a) => a.status === "atendido").length;
  const pendingConfirm = appointments.filter(
    (a) => a.date >= today && a.status === "agendado",
  ).length;
  const monthPrefix = today.slice(0, 7);
  const newThisMonth = patients.filter((p) => p.createdAt.startsWith(monthPrefix)).length;
  const overdueReturns = patients.filter((p) => p.nextReturn && p.nextReturn < today).length;
  const next = todays.find((a) =>
    ["confirmado", "aguardando", "agendado", "em_atendimento"].includes(a.status),
  );
  const byId = (id: string) => patients.find((p) => p.id === id);

  const alerts = useMemo(
    () =>
      patients
        .map((p) => ({ p, alert: growthAlert(p, "weight") ?? growthAlert(p, "height") }))
        .filter((x) => x.alert)
        .slice(0, 4),
    [patients],
  );

  const upcomingReturns = useMemo(
    () =>
      patients
        .filter(
          (p) => p.nextReturn && p.nextReturn >= today && p.nextReturn <= addDaysISO(today, 30),
        )
        .sort((a, b) => (a.nextReturn ?? "").localeCompare(b.nextReturn ?? ""))
        .slice(0, 4),
    [patients, today],
  );

  return (
    <div className="grid gap-6">
      {/* Banner de boas-vindas */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-hero p-6 text-white shadow-lift sm:p-8 animate-fade-up">
        <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-teal/30 blur-2xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="text-sm font-medium first-letter:uppercase text-white/80">
              {formatLongDate(today)}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold !text-white sm:text-4xl">
              {greeting()}, {settings.doctorShort}!
            </h1>
            <p className="mt-2 max-w-xl text-white/85">
              Você tem <b>{todays.length} consultas</b> hoje, {done} já atendidas.
              {requests.length > 0 && (
                <>
                  {" "}
                  E <b>{requests.length} pedidos de agendamento</b> esperando resposta.
                </>
              )}
            </p>
            {next && byId(next.patientId) && (
              <div className="mt-5 inline-flex flex-wrap items-center gap-3 rounded-2xl bg-white/15 p-2 pr-3 backdrop-blur-sm">
                <span className="rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-navy">
                  {next.time}
                </span>
                <span className="text-sm">
                  Próxima: <b>{byId(next.patientId)!.name}</b> · {next.reason}
                </span>
                <Button
                  size="sm"
                  className="bg-white text-navy hover:bg-white/90"
                  onClick={() => startAttendance(next, navigate)}
                >
                  <Play /> Atender
                </Button>
              </div>
            )}
          </div>
          <div className="hidden shrink-0 md:block">
            <div className="rounded-[2.25rem] bg-white/15 p-3 backdrop-blur-sm">
              <LogoMark tile className="h-32 w-32 rounded-[1.75rem] shadow-lift" />
            </div>
          </div>
        </div>
      </section>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Consultas hoje"
          value={todays.length}
          hint={`${done} atendidas`}
          icon={CalendarCheck2}
          tone="teal"
        />
        <StatCard
          label="A confirmar"
          value={pendingConfirm}
          hint="Próximos dias"
          icon={CalendarClock}
          tone="warning"
        />
        <StatCard
          label="Novos no mês"
          value={newThisMonth}
          hint="Pacientes cadastrados"
          icon={UserPlus}
          tone="blue"
        />
        <StatCard
          label="Retornos atrasados"
          value={overdueReturns}
          hint="Precisam de contato"
          icon={Repeat2}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Agenda de hoje */}
        <Card>
          <CardHeader
            title="Agenda de hoje"
            subtitle={`${todays.length} consultas · ${done} atendidas`}
            icon={CalendarDays}
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to="/agenda">
                  Ver agenda <ArrowRight />
                </Link>
              </Button>
            }
          />
          {todays.length ? (
            <ul className="divide-y divide-border">
              {todays.map((a) => {
                const p = byId(a.patientId);
                if (!p) return null;
                const isNow = a.status === "em_atendimento";
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "group flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-muted/50 sm:flex-nowrap sm:px-5",
                      isNow && "bg-info/5",
                      a.status === "atendido" && "opacity-70",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setDetail(a)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span
                        className={cn(
                          "w-14 shrink-0 rounded-lg py-1.5 text-center text-sm font-extrabold",
                          isNow ? "bg-info text-white" : "bg-muted text-navy",
                        )}
                      >
                        {a.time}
                      </span>
                      <Avatar name={p.name} sex={p.sex} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-navy">{p.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {formatAge(p.birthDate)} · {a.reason}
                        </span>
                      </span>
                    </button>
                    <div className="ml-auto flex items-center gap-1">
                      <StatusSelect appointment={a} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-success"
                        onClick={() => setWa(a)}
                        aria-label="Lembrar pelo WhatsApp"
                      >
                        <MessageCircle />
                      </Button>
                      {a.status !== "atendido" && a.status !== "faltou" && (
                        <Button
                          variant={isNow ? "brand" : "soft"}
                          size="sm"
                          onClick={() => startAttendance(a, navigate)}
                        >
                          <Play />{" "}
                          <span className="hidden sm:inline">
                            {isNow ? "Continuar" : "Iniciar"}
                          </span>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Nenhuma consulta hoje"
              text="Aproveite para organizar os retornos ou divulgar seu link de agendamento."
              action={
                <Button variant="brand" onClick={() => actions.openNewAppt()}>
                  Agendar consulta
                </Button>
              }
            />
          )}
        </Card>

        <div className="grid content-start gap-6">
          {/* Solicitações */}
          <Card>
            <CardHeader
              title="Pedidos de agendamento"
              subtitle="Vindos do seu link público"
              icon={Inbox}
              action={
                requests.length ? (
                  <Pill tone="warning">{requests.length} pendentes</Pill>
                ) : undefined
              }
            />
            {requests.length ? (
              <ul className="divide-y divide-border">
                {requests.map((r) => (
                  <li key={r.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={r.childName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-navy">{r.childName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatAge(r.childBirth)} · {r.guardianName}
                        </p>
                        <p className="mt-1 text-sm">{r.reason}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-teal">
                          <Clock className="h-3.5 w-3.5" /> {formatDate(r.date)} às {r.time}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
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
                        Sugerir outro horário
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          actions.rejectRequest(r.id);
                          toast("Pedido recusado");
                        }}
                      >
                        <X /> Recusar
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

          {/* Alertas de crescimento */}
          <Card>
            <CardHeader
              title="Atenção no crescimento"
              subtitle="Quedas de percentil detectadas"
              icon={TrendingDown}
            />
            {alerts.length ? (
              <ul className="divide-y divide-border">
                {alerts.map(({ p, alert }) => (
                  <li key={p.id}>
                    <Link
                      to="/pacientes/$id"
                      params={{ id: p.id }}
                      search={{ aba: "crescimento" }}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50"
                    >
                      <span
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-lg",
                          alert!.level === "danger"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/15 text-warning",
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

          {/* Retornos */}
          <Card>
            <CardHeader title="Retornos próximos" subtitle="Nos próximos 30 dias" icon={Repeat2} />
            {upcomingReturns.length ? (
              <ul className="divide-y divide-border">
                {upcomingReturns.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={p.name} sex={p.sex} size="sm" />
                    <Link to="/pacientes/$id" params={{ id: p.id }} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-navy hover:underline">
                        {p.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(p.nextReturn)} · em {daysBetween(today, p.nextReturn!)} dias
                      </span>
                    </Link>
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => actions.openNewAppt({ patientId: p.id, date: p.nextReturn })}
                    >
                      Agendar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Repeat2} title="Sem retornos próximos" />
            )}
          </Card>
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
      <SuggestDialog request={suggest} onClose={() => setSuggest(null)} />
    </div>
  );
}

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
