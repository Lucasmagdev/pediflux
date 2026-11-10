import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Baby,
  CalendarPlus,
  ChevronRight,
  Download,
  FileText,
  Heart,
  Home,
  LineChart,
  Lock,
  MapPin,
  MessageCircle,
  Ruler,
  Scale,
  Stethoscope,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppLoading, Logo, LogoMark } from "@/components/pediflux/Logo";
import { Avatar } from "@/components/pediflux/ui";
import { GrowthChart, GrowthLegend } from "@/components/pediflux/GrowthChart";
import { ExamThumb } from "@/components/pediflux/ExamsPanel";
import { VitalsCard } from "@/components/pediflux/HealthOverview";
import { TYPE_STYLE } from "@/components/pediflux/typeStyle";
import { MEASURE_META, type GrowthMeasure } from "@/data/growth-reference";
import { useStore } from "@/data/store";
import type { ExamFile, Patient } from "@/data/types";
import {
  addDaysISO,
  daysBetween,
  firstName,
  formatAge,
  formatDate,
  parseISO,
  todayISO,
  weekdayShort,
  whatsappLink,
} from "@/lib/age";
import { fmt, patientPoints } from "@/lib/growth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/p/$token")({
  ssr: false,
  pendingComponent: AppLoading,
  head: () => ({
    meta: [
      { title: "Portal da família · PediFlux" },
      { name: "description", content: "Consultas, crescimento e exames do seu filho." },
      { name: "theme-color", content: "#F5F9FC" },
    ],
  }),
  component: PortalPage,
});

type Tab = "inicio" | "consultas" | "crescimento" | "exames";
const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "inicio", label: "Início", icon: Home },
  { key: "consultas", label: "Consultas", icon: Stethoscope },
  { key: "crescimento", label: "Crescimento", icon: LineChart },
  { key: "exames", label: "Exames", icon: FileText },
];

const MONTHS_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Leitura amigável do percentil (sem jargão nem alarme). */
function band(p: number | undefined) {
  if (p == null) return { label: "sem medida", cls: "bg-muted text-muted-foreground" };
  if (p >= 15 && p <= 85) return { label: "esperado", cls: "bg-success/15 text-success" };
  if (p >= 3 && p <= 97) return { label: "na faixa", cls: "bg-sky text-info" };
  return { label: "vamos conversar", cls: "bg-peach text-orange" };
}

function friendly(name: string, percentile: number | undefined) {
  if (percentile == null) return `Ainda não temos medidas de ${name} registradas.`;
  if (percentile >= 15 && percentile <= 85) return `${name} está crescendo dentro do esperado. 💙`;
  if (percentile >= 3 && percentile <= 97)
    return `${name} está dentro da faixa esperada para a idade.`;
  return `A pediatra vai conversar com você sobre o crescimento de ${name} na próxima consulta.`;
}

function weekStart(iso: string) {
  const d = parseISO(iso).getDay();
  return addDaysISO(iso, d === 0 ? -6 : 1 - d);
}

/** Régua de faixa: marcador sobre zonas suaves (vermelho / laranja / verde). */
function RangeBar({ percentile }: { percentile: number | undefined }) {
  return (
    <span className="relative mt-2 block h-2 rounded-full bg-[linear-gradient(90deg,var(--rose)_0%,var(--peach)_10%,oklch(0.9_0.08_165)_25%,oklch(0.9_0.08_165)_75%,var(--peach)_90%,var(--rose)_100%)]">
      {percentile != null && (
        <span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-teal bg-card shadow-soft"
          style={{ left: `${Math.min(97, Math.max(3, percentile))}%` }}
        />
      )}
    </span>
  );
}

function PortalPage() {
  const { token } = Route.useParams();
  const phone = useStore((s) => s.portalTokens[token]);
  const patients = useStore((s) => s.patients);
  const settings = useStore((s) => s.settings);
  const children = useMemo(
    () =>
      patients
        .filter((p) => p.phone === phone)
        .sort((a, b) => b.birthDate.localeCompare(a.birthDate)),
    [patients, phone],
  );
  const [childId, setChildId] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>("inicio");
  const child = children.find((c) => c.id === childId) ?? children[0];

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab, childId]);

  if (!phone || !child) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface px-6 text-center">
        <div className="max-w-sm">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Lock className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">Link indisponível</h1>
          <p className="mt-2 text-muted-foreground">
            Este acesso expirou ou foi desativado. Peça um novo link ao consultório.
          </p>
          <Logo size="sm" className="mt-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface sm:bg-frame sm:py-8">
      <div className="relative mx-auto min-h-screen max-w-md bg-surface sm:min-h-[calc(100vh-4rem)] sm:overflow-clip sm:rounded-[2.5rem] sm:border-[10px] sm:border-white sm:shadow-[0_30px_80px_-30px_oklch(0.31_0.09_258/0.4)]">
        {/* Topo */}
        <header className="sticky top-0 z-20 bg-surface/90 px-5 pb-3 pt-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-xs font-medium text-muted-foreground">Portal da família</p>
              <p className="truncate text-base font-extrabold text-navy">
                Olá, {firstName(child.guardianName)} 👋
              </p>
            </div>
            <a
              href={whatsappLink(
                settings.phone,
                `Olá! Sou ${child.guardianRelation === "Pai" ? "o pai" : "a mãe"} de ${child.name}.`,
              )}
              target="_blank"
              rel="noreferrer"
              className="grid h-10 w-10 place-items-center rounded-full bg-card text-success shadow-soft"
              aria-label="Falar com o consultório no WhatsApp"
            >
              <MessageCircle className="h-[18px] w-[18px]" />
            </a>
          </div>
          {children.length > 1 && (
            <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
              {children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChildId(c.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-sm font-semibold transition",
                    c.id === child.id
                      ? "bg-navy text-white shadow-soft"
                      : "bg-card text-muted-foreground shadow-soft",
                  )}
                >
                  <Avatar name={c.name} sex={c.sex} size="sm" />
                  {firstName(c.name)}
                </button>
              ))}
            </div>
          )}
        </header>

        <main className="px-5 pb-32 pt-2">
          {tab === "inicio" && <HomeTab child={child} goTab={setTab} />}
          {tab === "consultas" && <ConsultsTab child={child} />}
          {tab === "crescimento" && <GrowthTab child={child} />}
          {tab === "exames" && <ExamsTab child={child} />}
        </main>

        {/* Navegação inferior flutuante */}
        <nav className="fixed bottom-4 left-1/2 z-30 grid w-[calc(100%-2rem)] max-w-[24rem] -translate-x-1/2 grid-cols-4 gap-1 rounded-[1.25rem] bg-card p-1.5 shadow-lift sm:bottom-12">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold transition",
                  active ? "bg-teal text-white" : "text-muted-foreground hover:text-navy",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/* ---------------- Início ---------------- */
function HomeTab({ child, goTab }: { child: Patient; goTab: (t: Tab) => void }) {
  const settings = useStore((s) => s.settings);
  const appointments = useStore((s) => s.appointments);
  const allConsults = useStore((s) => s.consultations);
  const today = todayISO();
  const upcoming = useMemo(
    () =>
      appointments.filter(
        (a) =>
          a.patientId === child.id &&
          a.date >= today &&
          a.status !== "faltou" &&
          a.status !== "atendido",
      ),
    [appointments, child.id, today],
  );
  const next = upcoming[0];
  const shared = useMemo(
    () => allConsults.filter((c) => c.patientId === child.id && c.sharedWithParent),
    [allConsults, child.id],
  );
  const week = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart(today), i));

  const tiles: { m: GrowthMeasure; label: string; icon: LucideIcon; bg: string; tint: string }[] = [
    { m: "weight", label: "Peso", icon: Scale, bg: "bg-peach", tint: "text-orange" },
    { m: "height", label: "Altura", icon: Ruler, bg: "bg-sky", tint: "text-info" },
    {
      m: "head",
      label: "Cabeça",
      icon: Baby,
      bg: "bg-lavender",
      tint: "text-[oklch(0.55_0.15_290)]",
    },
    { m: "bmi", label: "IMC", icon: Activity, bg: "bg-teal/10", tint: "text-teal" },
  ];
  const weightPts = patientPoints(child, "weight");

  return (
    <div className="grid grid-cols-1 gap-5 animate-fade-up">
      {/* Cartão da criança */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-teal p-5 text-white shadow-lift">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-36 w-36 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <span className="rounded-full bg-white/25 p-1">
            <Avatar name={child.name} sex={child.sex} size="lg" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xl font-extrabold">{child.name}</p>
            <p className="text-sm text-white/85">{formatAge(child.birthDate)}</p>
          </div>
        </div>
        <div className="relative mt-5 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
          {next ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                Próxima consulta
              </p>
              <p className="mt-1 text-lg font-extrabold">
                {weekdayShort(next.date)}, {formatDate(next.date).slice(0, 5)} às {next.time}
              </p>
              <p className="text-sm text-white/85">
                {next.type} · {settings.doctorShort}
                {next.date === today
                  ? " · hoje"
                  : ` · em ${daysBetween(today, next.date)} ${daysBetween(today, next.date) === 1 ? "dia" : "dias"}`}
              </p>
              <Button size="sm" className="mt-3 bg-white text-navy hover:bg-white/90" asChild>
                <a
                  href={whatsappLink(
                    settings.phone,
                    `Olá! Confirmo a consulta de ${firstName(child.name)} em ${formatDate(next.date)} às ${next.time}.`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle /> Confirmar presença
                </a>
              </Button>
            </>
          ) : (
            <>
              <p className="font-bold">Nenhuma consulta marcada</p>
              <p className="text-sm text-white/85">
                {child.nextReturn
                  ? `Retorno sugerido para ${formatDate(child.nextReturn)}`
                  : "Marque quando precisar."}
              </p>
            </>
          )}
        </div>
      </section>

      {/* Agenda da semana */}
      <section className="rounded-[1.5rem] bg-card p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Agenda</h2>
          <span className="text-xs font-semibold text-muted-foreground first-letter:uppercase">
            {MONTHS_LONG[parseISO(today).getMonth()]}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {week.map((d) => {
            const isToday = d === today;
            const has = appointments.some((a) => a.patientId === child.id && a.date === d);
            return (
              <div
                key={d}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-full py-2",
                  isToday &&
                    "bg-gradient-to-b from-teal to-[var(--brand-blue)] text-white shadow-soft",
                )}
              >
                <span
                  className={cn("text-[11px]", isToday ? "text-white/85" : "text-muted-foreground")}
                >
                  {weekdayShort(d)}
                </span>
                <span className={cn("text-base font-extrabold", !isToday && "text-navy")}>
                  {parseISO(d).getDate()}
                </span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    has ? (isToday ? "bg-white" : "bg-orange") : "bg-transparent",
                  )}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2.5">
          {upcoming.slice(0, 2).map((a) => {
            const st = TYPE_STYLE[a.type];
            return (
              <div key={a.id} className={cn("flex items-center gap-3 rounded-2xl p-3", st.bg)}>
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card shadow-soft",
                    st.tint,
                  )}
                >
                  <st.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-navy">{a.type}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {weekdayShort(a.date)}, {formatDate(a.date).slice(0, 5)} ·{" "}
                    {settings.doctorShort}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-card/80 px-2.5 py-1 text-xs font-bold text-navy">
                  {a.time}
                </span>
              </div>
            );
          })}
          <a
            href={`/agendar/${settings.slug}`}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal/40 py-3 text-sm font-bold text-teal transition hover:bg-teal/5"
          >
            <CalendarPlus className="h-4 w-4" /> Pedir novo horário
          </a>
        </div>
      </section>

      {/* Crescimento */}
      <section className="rounded-[1.5rem] bg-card p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">Crescimento</h2>
          <button
            type="button"
            onClick={() => goTab("crescimento")}
            className="text-xs font-bold text-teal"
          >
            Ver curva ›
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => {
            const pts = patientPoints(child, t.m);
            const last = pts[pts.length - 1];
            const b = band(last?.percentile);
            return (
              <button
                key={t.m}
                type="button"
                onClick={() => goTab("crescimento")}
                className={cn("rounded-2xl p-3 text-left", t.bg)}
              >
                <span className="flex items-center justify-between">
                  <span
                    className={cn("grid h-8 w-8 place-items-center rounded-lg bg-card", t.tint)}
                  >
                    <t.icon className="h-4 w-4" />
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", b.cls)}>
                    {b.label}
                  </span>
                </span>
                <span className="mt-2 block text-xl font-extrabold text-navy">
                  {last ? fmt(last.value, t.m === "weight" && last.value < 20 ? 2 : 1) : "—"}
                  <span className="ml-1 text-xs font-semibold text-muted-foreground">
                    {MEASURE_META[t.m].unit}
                  </span>
                </span>
                <span className="block text-xs font-medium text-muted-foreground">{t.label}</span>
                <RangeBar percentile={last?.percentile} />
              </button>
            );
          })}
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-surface p-3 text-sm text-navy">
          <Heart className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
          {friendly(firstName(child.name), weightPts[weightPts.length - 1]?.percentile)}
        </p>
      </section>

      {/* Sinais vitais */}
      {shared.some((c) => c.vitals) && (
        <section>
          <h2 className="mb-3 text-base font-bold">Última consulta</h2>
          <VitalsCard consultations={shared} />
        </section>
      )}

      {/* Consultório */}
      <section className="flex items-center gap-3 rounded-[1.5rem] bg-card p-4 shadow-soft">
        <Avatar name={settings.doctorName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-navy">{settings.doctorName}</p>
          <p className="flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-2">{settings.address}</span>
          </p>
        </div>
        <a
          href={whatsappLink(settings.phone, `Olá! Sou responsável por ${child.name}.`)}
          target="_blank"
          rel="noreferrer"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success text-white shadow-soft"
          aria-label="WhatsApp do consultório"
        >
          <MessageCircle className="h-[18px] w-[18px]" />
        </a>
      </section>
    </div>
  );
}

/* ---------------- Consultas ---------------- */
function ConsultsTab({ child }: { child: Patient }) {
  const all = useStore((s) => s.consultations);
  const list = useMemo(
    () =>
      all
        .filter((c) => c.patientId === child.id && c.sharedWithParent)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [all, child.id],
  );
  if (!list.length)
    return (
      <p className="mt-4 rounded-[1.5rem] bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
        Nenhuma consulta compartilhada ainda.
      </p>
    );
  return (
    <div className="grid grid-cols-1 gap-4 animate-fade-up">
      <div>
        <h1 className="text-xl font-extrabold">Consultas</h1>
        <p className="text-sm text-muted-foreground">
          {list.length} {list.length === 1 ? "consulta" : "consultas"} de {firstName(child.name)}
        </p>
      </div>
      <ol className="grid grid-cols-1 gap-3">
        {list.map((c) => {
          const st = TYPE_STYLE[c.type];
          return (
            <li key={c.id} className="grid grid-cols-[44px_1fr] gap-3">
              <div className="pt-3 text-center">
                <p className="text-lg font-extrabold leading-none text-navy">
                  {c.date.slice(8, 10)}
                </p>
                <p className="text-[11px] text-muted-foreground">{formatDate(c.date).slice(3)}</p>
              </div>
              <article className={cn("rounded-2xl p-4", st.bg)}>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg bg-card shadow-soft",
                      st.tint,
                    )}
                  >
                    <st.icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {c.type}
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold text-navy">{c.diagnosis}</p>
                <p className="mt-1 line-clamp-3 text-sm text-navy/75">{c.plan}</p>
                {(c.returnIn || c.vitals) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.returnIn && (
                      <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-bold text-teal">
                        {c.returnIn}
                      </span>
                    )}
                    {c.vitals?.temp != null && (
                      <span className="rounded-full bg-card/70 px-2.5 py-1 text-[11px] font-semibold text-navy">
                        {fmt(c.vitals.temp, 1)} °C
                      </span>
                    )}
                    {c.vitals?.hr != null && (
                      <span className="rounded-full bg-card/70 px-2.5 py-1 text-[11px] font-semibold text-navy">
                        {c.vitals.hr} bpm
                      </span>
                    )}
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------------- Crescimento ---------------- */
function GrowthTab({ child }: { child: Patient }) {
  const [measure, setMeasure] = useState<GrowthMeasure>("weight");
  const [showAll, setShowAll] = useState(false);
  const measures: { m: GrowthMeasure; label: string }[] = [
    { m: "weight", label: "Peso" },
    { m: "height", label: "Altura" },
    { m: "head", label: "Cabeça" },
  ];
  const pts = patientPoints(child, measure);
  const last = pts[pts.length - 1];
  const meta = MEASURE_META[measure];
  const digits = (v: number) => (measure === "weight" && v < 20 ? 2 : 1);
  const b = band(last?.percentile);

  return (
    <div className="grid grid-cols-1 gap-4 animate-fade-up">
      <h1 className="text-xl font-extrabold">Crescimento</h1>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-card p-1 shadow-soft">
        {measures.map(({ m, label }) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMeasure(m);
              setShowAll(false);
            }}
            className={cn(
              "rounded-xl py-2 text-sm font-semibold transition",
              measure === m ? "bg-teal text-white" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-teal p-5 text-white shadow-lift">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
        <p className="relative text-sm text-white/85">
          {measure === "head" ? "Perímetro da cabeça" : meta.short}
          {last && ` · ${formatDate(last.date)}`}
        </p>
        <p className="relative mt-1 text-5xl font-extrabold tracking-tight">
          {last ? fmt(last.value, digits(last.value)) : "—"}
          <span className="ml-1.5 text-xl font-semibold text-white/80">{meta.unit}</span>
        </p>
        <span
          className={cn(
            "relative mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold",
            b.cls.split(" ").find((c) => c.startsWith("text-")),
          )}
        >
          {b.label}
        </span>
        <p className="relative mt-3 text-sm text-white/90">
          {friendly(firstName(child.name), last?.percentile)}
        </p>
      </section>

      <section className="rounded-[1.5rem] bg-card p-3 shadow-soft">
        {pts.length ? (
          <GrowthChart patient={child} measure={measure} simple height={250} />
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">Sem medidas ainda.</p>
        )}
        <div className="px-2 pb-1 pt-2">
          <GrowthLegend simple />
        </div>
      </section>

      <section className="rounded-[1.5rem] bg-card shadow-soft">
        <p className="px-4 pb-1 pt-4 text-sm font-bold text-navy">Medições</p>
        <ul className="divide-y divide-border">
          {[...pts]
            .reverse()
            .slice(0, showAll ? undefined : 5)
            .map((p) => {
              const pb = band(p.percentile);
              return (
                <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>
                    <span className="block font-semibold text-navy">{formatDate(p.date)}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.date === child.birthDate
                        ? "Nascimento"
                        : formatAge(child.birthDate, p.date)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <b className="text-navy">
                      {fmt(p.value, digits(p.value))} {meta.unit}
                    </b>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", pb.cls)}>
                      {pb.label}
                    </span>
                  </span>
                </li>
              );
            })}
        </ul>
        {pts.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="w-full border-t border-border py-3 text-sm font-semibold text-teal"
          >
            {showAll ? "Mostrar menos" : `Ver todas (${pts.length})`}
          </button>
        )}
      </section>
    </div>
  );
}

/* ---------------- Exames ---------------- */
function ExamsTab({ child }: { child: Patient }) {
  const all = useStore((s) => s.exams);
  const list = useMemo(
    () => all.filter((e) => e.patientId === child.id).sort((a, b) => b.date.localeCompare(a.date)),
    [all, child.id],
  );
  const cats = useMemo(() => [...new Set(list.map((e) => e.category))], [list]);
  const [filter, setFilter] = useState<string>("Todos");
  const [viewing, setViewing] = useState<ExamFile | null>(null);
  const shown = list.filter((e) => filter === "Todos" || e.category === filter);

  return (
    <div className="grid grid-cols-1 gap-4 animate-fade-up">
      <div>
        <h1 className="text-xl font-extrabold">Exames e documentos</h1>
        <p className="text-sm text-muted-foreground">Enviados pelo consultório</p>
      </div>
      {list.length === 0 ? (
        <p className="rounded-[1.5rem] bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">
          Nenhum exame disponível ainda.
        </p>
      ) : (
        <>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {["Todos", ...cats].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-soft transition",
                  filter === c ? "bg-navy text-white" : "bg-card text-muted-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {shown.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setViewing(e)}
                className="overflow-hidden rounded-2xl bg-card text-left shadow-soft transition active:scale-[0.98]"
              >
                <ExamThumb exam={e} className="h-24" />
                <span className="block p-3">
                  <span className="block truncate text-sm font-bold text-navy">{e.name}</span>
                  <span className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    {formatDate(e.date)}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
            <DialogDescription>
              {viewing?.category} · {formatDate(viewing?.date)}
            </DialogDescription>
          </DialogHeader>
          {viewing && <ExamThumb exam={viewing} className="h-64 rounded-2xl" />}
          <Button variant="brand" onClick={() => toast.success("Download iniciado (demonstração)")}>
            <Download /> Baixar arquivo
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
