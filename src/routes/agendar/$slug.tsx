import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppLoading, Logo } from "@/components/pediflux/Logo";
import { Avatar, Field } from "@/components/pediflux/ui";
import { actions, useStore } from "@/data/store";
import {
  addDaysISO,
  formatDate,
  minToTime,
  parseISO,
  timeToMin,
  todayISO,
  weekdayShort,
  whatsappLink,
} from "@/lib/age";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agendar/$slug")({
  ssr: false,
  pendingComponent: AppLoading,
  head: () => ({
    meta: [
      { title: "Agendar consulta · PediFlux" },
      { name: "description", content: "Escolha um horário para a consulta pediátrica." },
    ],
  }),
  component: BookingPage,
});

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function phoneMask(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function BookingPage() {
  const { slug } = Route.useParams();
  const settings = useStore((s) => s.settings);
  const appointments = useStore((s) => s.appointments);
  const blocks = useStore((s) => s.blocks);
  const requests = useStore((s) => s.requests);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [f, setF] = useState({
    guardianName: "",
    childName: "",
    childBirth: "",
    phone: "",
    reason: "",
  });

  const today = todayISO();
  const days = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => addDaysISO(today, i))
        .filter((d) => settings.hours[parseISO(d).getDay()]?.enabled)
        .slice(0, 12),
    [today, settings.hours],
  );

  const slotsFor = (d: string) => {
    const h = settings.hours[parseISO(d).getDay()];
    if (!h?.enabled) return [];
    const dur = settings.defaultDuration;
    const taken = appointments
      .filter((a) => a.date === d)
      .map((a) => [timeToMin(a.time), timeToMin(a.time) + a.duration]);
    const blocked = blocks
      .filter((b) => b.date === d)
      .map((b) => [timeToMin(b.start), timeToMin(b.end)]);
    const requested = requests
      .filter((r) => r.date === d)
      .map((r) => [timeToMin(r.time), timeToMin(r.time) + dur]);
    const now = new Date();
    const nowMin = d === today ? now.getHours() * 60 + now.getMinutes() + 60 : 0;
    const out: string[] = [];
    for (let m = timeToMin(h.start); m + dur <= timeToMin(h.end); m += dur) {
      const busy = [...taken, ...blocked, ...requested].some(([s, e]) => m < e! && m + dur > s!);
      if (!busy && m >= nowMin) out.push(minToTime(m));
    }
    return out;
  };

  const slots = date ? slotsFor(date) : [];

  if (slug !== settings.slug) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface px-4 text-center">
        <div>
          <Logo size="lg" />
          <h1 className="mt-6 text-2xl font-extrabold">Página não encontrada</h1>
          <p className="mt-2 text-muted-foreground">Confira o link enviado pelo consultório.</p>
        </div>
      </div>
    );
  }

  function submit() {
    if (
      !f.guardianName ||
      !f.childName ||
      !f.childBirth ||
      f.phone.replace(/\D/g, "").length < 10
    ) {
      toast.error("Preencha os dados obrigatórios");
      return;
    }
    actions.addRequest({ ...f, reason: f.reason || "Consulta", date: date!, time: time! });
    setStep(3);
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Cabeçalho */}
      <header className="relative overflow-hidden bg-gradient-hero px-4 pb-16 pt-6 text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative mx-auto max-w-xl">
          <Logo size="sm" onDark />
          <div className="mt-6 flex items-center gap-4">
            <div className="rounded-full bg-white/20 p-1">
              <Avatar name={settings.doctorName} size="lg" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold !text-white">{settings.doctorName}</h1>
              <p className="text-sm text-white/85">
                {settings.specialty} · {settings.crm}
              </p>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 text-sm text-white/85">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {settings.address}
          </p>
        </div>
      </header>

      <main className="relative mx-auto -mt-10 max-w-xl px-4 pb-12">
        <div className="card-surface overflow-hidden">
          {/* Progresso */}
          {step < 3 && (
            <div className="flex border-b border-border">
              {["Horário", "Seus dados"].map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold",
                    step === i + 1 ? "text-navy" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-full text-xs",
                      step > i ? "bg-teal text-white" : "bg-muted",
                    )}
                  >
                    {i + 1}
                  </span>
                  {s}
                </div>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="p-5">
              <h2 className="flex items-center gap-2 text-lg font-extrabold">
                <CalendarDays className="h-5 w-5 text-teal" /> Escolha o dia
              </h2>
              <div className="-mx-5 mt-3 flex snap-x gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {days.map((d) => {
                  const free = slotsFor(d).length;
                  const dt = parseISO(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={!free}
                      onClick={() => {
                        setDate(d);
                        setTime(null);
                      }}
                      className={cn(
                        "flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2.5 transition disabled:opacity-40",
                        date === d
                          ? "border-teal bg-teal text-white shadow-soft"
                          : "border-border bg-card hover:border-teal/50",
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-semibold uppercase",
                          date === d ? "text-white/85" : "text-muted-foreground",
                        )}
                      >
                        {d === today ? "Hoje" : weekdayShort(d)}
                      </span>
                      <span className="text-xl font-extrabold">{dt.getDate()}</span>
                      <span
                        className={cn(
                          "text-[11px]",
                          date === d ? "text-white/85" : "text-muted-foreground",
                        )}
                      >
                        {MONTHS[dt.getMonth()]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <h2 className="mt-5 flex items-center gap-2 text-lg font-extrabold">
                <Clock className="h-5 w-5 text-teal" /> Escolha o horário
              </h2>
              {!date ? (
                <p className="mt-3 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                  Selecione um dia para ver os horários livres.
                </p>
              ) : slots.length ? (
                <div className="mt-3 grid gap-4">
                  {[
                    { label: "Manhã", list: slots.filter((t) => timeToMin(t) < 12 * 60) },
                    { label: "Tarde", list: slots.filter((t) => timeToMin(t) >= 12 * 60) },
                  ]
                    .filter((g) => g.list.length)
                    .map((g) => (
                      <div key={g.label}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {g.label}
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {g.list.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTime(t)}
                              className={cn(
                                "rounded-xl border py-2.5 text-sm font-bold transition",
                                time === t
                                  ? "border-teal bg-teal text-white"
                                  : "border-border bg-card text-navy hover:border-teal/50",
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                  Sem horários livres neste dia.
                </p>
              )}

              <Button
                variant="brand"
                size="lg"
                className="mt-6 w-full"
                disabled={!date || !time}
                onClick={() => setStep(2)}
              >
                Continuar
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="p-5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-navy"
              >
                <ArrowLeft className="h-4 w-4" /> Trocar horário
              </button>
              <div className="mb-5 flex items-center gap-3 rounded-2xl bg-accent p-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal text-white">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-navy">
                    {weekdayShort(date!)}, {formatDate(date!)} às {time}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {settings.defaultDuration} minutos · {settings.doctorShort}
                  </p>
                </div>
              </div>
              <div className="grid gap-4">
                <Field label="Seu nome *">
                  <Input
                    className="h-11"
                    value={f.guardianName}
                    onChange={(e) => setF({ ...f, guardianName: e.target.value })}
                    autoComplete="name"
                  />
                </Field>
                <Field label="WhatsApp *">
                  <Input
                    className="h-11"
                    inputMode="tel"
                    placeholder="(31) 99999-9999"
                    value={f.phone}
                    onChange={(e) => setF({ ...f, phone: phoneMask(e.target.value) })}
                    autoComplete="tel"
                  />
                </Field>
                <Field label="Nome da criança *">
                  <Input
                    className="h-11"
                    value={f.childName}
                    onChange={(e) => setF({ ...f, childName: e.target.value })}
                  />
                </Field>
                <Field label="Data de nascimento da criança *">
                  <Input
                    className="h-11"
                    type="date"
                    max={today}
                    value={f.childBirth}
                    onChange={(e) => setF({ ...f, childBirth: e.target.value })}
                  />
                </Field>
                <Field label="Motivo da consulta">
                  <Textarea
                    placeholder="Ex.: consulta de rotina, febre, retorno…"
                    value={f.reason}
                    onChange={(e) => setF({ ...f, reason: e.target.value })}
                  />
                </Field>
              </div>
              <Button variant="brand" size="lg" className="mt-6 w-full" onClick={submit}>
                Solicitar agendamento
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> Seus dados são usados apenas
                pelo consultório.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="p-6 text-center animate-fade-up">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/12 text-success">
                <CheckCircle2 className="h-9 w-9" />
              </span>
              <h2 className="mt-4 text-2xl font-extrabold">Solicitação enviada!</h2>
              <p className="mt-2 text-muted-foreground">
                Pedido para <b className="text-navy">{f.childName}</b> em{" "}
                <b className="text-navy">
                  {formatDate(date!)} às {time}
                </b>
                .
                <br />A clínica vai confirmar pelo WhatsApp.
              </p>
              <div className="mt-6 grid gap-2">
                <Button variant="success" asChild>
                  <a
                    href={whatsappLink(
                      settings.phone,
                      `Olá! Acabei de solicitar uma consulta para ${f.childName} em ${formatDate(date!)} às ${time}.`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle /> Falar com o consultório
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep(1);
                    setDate(null);
                    setTime(null);
                    setF({
                      guardianName: "",
                      childName: "",
                      childBirth: "",
                      phone: "",
                      reason: "",
                    });
                  }}
                >
                  Agendar para outra criança
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-1 text-center text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" /> {settings.clinicName} · {settings.phone}
          </span>
          <span className="mt-2 flex items-center gap-2">
            Agendamento por <Logo size="sm" className="opacity-90" />
          </span>
        </div>
      </main>
    </div>
  );
}
