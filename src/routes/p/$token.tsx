import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  Download,
  FileText,
  Heart,
  Home,
  LineChart,
  Lock,
  MessageCircle,
  Stethoscope,
} from "lucide-react";
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
import { Pill } from "@/components/pediflux/StatusBadge";
import { GrowthChart, GrowthLegend } from "@/components/pediflux/GrowthChart";
import { ExamThumb } from "@/components/pediflux/ExamsPanel";
import { MEASURE_META, type GrowthMeasure } from "@/data/growth-reference";
import { useStore } from "@/data/store";
import type { ExamFile, Patient } from "@/data/types";
import {
  daysBetween,
  firstName,
  formatAge,
  formatDate,
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
      { name: "theme-color", content: "#0B2E5E" },
    ],
  }),
  component: PortalPage,
});

type Tab = "inicio" | "consultas" | "crescimento" | "exames";
const TABS: { key: Tab; label: string; icon: typeof Home }[] = [
  { key: "inicio", label: "Início", icon: Home },
  { key: "consultas", label: "Consultas", icon: Stethoscope },
  { key: "crescimento", label: "Crescimento", icon: LineChart },
  { key: "exames", label: "Exames", icon: FileText },
];

/** Frase amigável para a família (sem jargão nem alarme). */
function friendly(name: string, percentile: number | undefined) {
  if (percentile == null) return `Ainda não temos medidas de ${name} registradas.`;
  if (percentile >= 15 && percentile <= 85) return `${name} está crescendo dentro do esperado. 💙`;
  if (percentile >= 3 && percentile <= 97)
    return `${name} está dentro da faixa esperada para a idade.`;
  return `A pediatra vai conversar com você sobre o crescimento de ${name} na próxima consulta.`;
}

function PortalPage() {
  const { token } = Route.useParams();
  const phone = useStore((s) => s.portalTokens[token]);
  const patients = useStore((s) => s.patients);
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
    <div className="min-h-screen bg-[oklch(0.95_0.012_230)] sm:py-6">
      <div className="relative mx-auto min-h-screen max-w-md bg-surface sm:min-h-[calc(100vh-3rem)] sm:overflow-hidden sm:rounded-[2rem] sm:shadow-lift">
        {/* Topo */}
        <header className="relative overflow-hidden bg-gradient-hero px-5 pb-20 pt-5 text-white">
          <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold">
              <LogoMark tile className="h-8 w-8" /> Portal da família
            </span>
            <span className="text-xs text-white/75">Olá, {firstName(child.guardianName)}</span>
          </div>
          {children.length > 1 && (
            <div className="relative mt-4 flex gap-2 overflow-x-auto">
              {children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChildId(c.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold transition",
                    c.id === child.id ? "bg-white text-navy" : "bg-white/15 text-white",
                  )}
                >
                  <Avatar name={c.name} sex={c.sex} size="sm" />
                  {firstName(c.name)}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Cartão da criança */}
        <div className="relative z-10 -mt-14 px-4">
          <div className="card-surface flex items-center gap-4 p-4">
            <Avatar name={child.name} sex={child.sex} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold text-navy">{child.name}</p>
              <p className="text-sm text-muted-foreground">{formatAge(child.birthDate)}</p>
            </div>
          </div>
        </div>

        <main className="px-4 pb-28 pt-5">
          {tab === "inicio" && <HomeTab child={child} goTab={setTab} />}
          {tab === "consultas" && <ConsultsTab child={child} />}
          {tab === "crescimento" && <GrowthTab child={child} />}
          {tab === "exames" && <ExamsTab child={child} />}
        </main>

        {/* Navegação inferior */}
        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-md grid-cols-4 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:absolute sm:rounded-b-[2rem]">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                tab === key ? "text-teal" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-12 place-items-center rounded-full transition",
                  tab === key && "bg-teal/12",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function HomeTab({ child, goTab }: { child: Patient; goTab: (t: Tab) => void }) {
  const settings = useStore((s) => s.settings);
  const appointments = useStore((s) => s.appointments);
  const today = todayISO();
  const next = appointments.find(
    (a) =>
      a.patientId === child.id &&
      a.date >= today &&
      a.status !== "faltou" &&
      a.status !== "atendido",
  );
  const w = patientPoints(child, "weight");
  const h = patientPoints(child, "height");
  const lw = w[w.length - 1];
  const lh = h[h.length - 1];

  return (
    <div className="grid gap-4">
      {next ? (
        <div className="overflow-hidden rounded-3xl bg-navy p-5 text-white shadow-lift">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
            Próxima consulta
          </p>
          <p className="mt-2 text-2xl font-extrabold">
            {weekdayShort(next.date)}, {formatDate(next.date).slice(0, 5)} às {next.time}
          </p>
          <p className="mt-1 text-sm text-white/80">
            {next.type} · {settings.doctorShort}
            {next.date !== today && ` · em ${daysBetween(today, next.date)} dias`}
          </p>
          <Button size="sm" className="mt-4 bg-white/15 text-white hover:bg-white/25" asChild>
            <a
              href={whatsappLink(
                settings.phone,
                `Olá! Confirmo a consulta de ${firstName(child.name)} em ${formatDate(next.date)} às ${next.time}.`,
              )}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle /> Confirmar pelo WhatsApp
            </a>
          </Button>
        </div>
      ) : (
        <div className="card-surface flex items-center gap-4 p-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-teal">
            <CalendarDays className="h-6 w-6" />
          </span>
          <div>
            <p className="font-bold text-navy">Nenhuma consulta marcada</p>
            <p className="text-sm text-muted-foreground">
              {child.nextReturn
                ? `Retorno sugerido para ${formatDate(child.nextReturn)}`
                : "Agende quando precisar."}
            </p>
          </div>
        </div>
      )}

      <a
        href={`/agendar/${settings.slug}`}
        className="flex items-center gap-4 rounded-3xl bg-gradient-brand p-5 text-white shadow-soft transition active:scale-[0.99]"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20">
          <CalendarPlus className="h-6 w-6" />
        </span>
        <span className="flex-1">
          <span className="block font-bold">Pedir novo horário</span>
          <span className="block text-sm text-white/85">Escolha o melhor dia para vocês</span>
        </span>
        <ChevronRight className="h-5 w-5" />
      </a>

      <button
        type="button"
        onClick={() => goTab("crescimento")}
        className="card-surface p-5 text-left"
      >
        <div className="flex items-center justify-between">
          <p className="font-bold text-navy">Crescimento</p>
          <span className="text-xs font-semibold text-teal">Ver curva</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <BigNumber
            label="Peso"
            value={lw ? fmt(lw.value, lw.value < 20 ? 2 : 1) : "—"}
            unit="kg"
            tone="teal"
          />
          <BigNumber label="Altura" value={lh ? fmt(lh.value) : "—"} unit="cm" tone="blue" />
        </div>
        <p className="mt-3 flex items-start gap-2 text-sm text-navy">
          <Heart className="mt-0.5 h-4 w-4 shrink-0 text-teal" />{" "}
          {friendly(firstName(child.name), lw?.percentile)}
        </p>
      </button>

      <div className="card-surface p-5">
        <p className="font-bold text-navy">{settings.clinicName}</p>
        <p className="mt-1 text-sm text-muted-foreground">{settings.address}</p>
        <Button variant="outline" className="mt-4 w-full text-success" asChild>
          <a
            href={whatsappLink(
              settings.phone,
              `Olá! Sou ${child.guardianRelation === "Pai" ? "o pai" : "a mãe"} de ${child.name}.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle /> Falar com o consultório
          </a>
        </Button>
      </div>
    </div>
  );
}

function BigNumber({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone: "teal" | "blue";
}) {
  return (
    <div className={cn("rounded-2xl p-4", tone === "teal" ? "bg-teal/10" : "bg-info/10")}>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={cn("text-3xl font-extrabold", tone === "teal" ? "text-teal" : "text-info")}>
        {value}
        <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

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
      <p className="card-surface p-6 text-center text-sm text-muted-foreground">
        Nenhuma consulta compartilhada ainda.
      </p>
    );
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-extrabold">Histórico de consultas</h2>
      {list.map((c) => (
        <article key={c.id} className="card-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-navy">{formatDate(c.date)}</span>
            <Pill tone={c.type === "Doença aguda" ? "warning" : "teal"}>{c.type}</Pill>
          </div>
          <p className="mt-2 text-sm font-semibold text-navy">{c.diagnosis}</p>
          <p className="mt-1 text-sm text-muted-foreground">{c.plan}</p>
          {c.returnIn && <p className="mt-2 text-xs font-semibold text-teal">{c.returnIn}</p>}
        </article>
      ))}
    </div>
  );
}

function GrowthTab({ child }: { child: Patient }) {
  const [measure, setMeasure] = useState<GrowthMeasure>("weight");
  const measures: GrowthMeasure[] = ["weight", "height", "head"];
  const pts = patientPoints(child, measure);
  const last = pts[pts.length - 1];
  const meta = MEASURE_META[measure];
  const digits = (v: number) => (measure === "weight" && v < 20 ? 2 : 1);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
        {measures.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMeasure(m)}
            className={cn(
              "rounded-xl py-2 text-sm font-semibold transition",
              measure === m ? "bg-card text-navy shadow-soft" : "text-muted-foreground",
            )}
          >
            {m === "head" ? "Cabeça" : MEASURE_META[m].short}
          </button>
        ))}
      </div>

      <div className="card-surface p-5 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          {measure === "head" ? "Perímetro da cabeça" : meta.short}
        </p>
        <p className="mt-1 text-5xl font-extrabold text-navy">
          {last ? fmt(last.value, digits(last.value)) : "—"}
          <span className="ml-1 text-lg font-semibold text-muted-foreground">{meta.unit}</span>
        </p>
        {last && (
          <p className="mt-1 text-xs text-muted-foreground">medido em {formatDate(last.date)}</p>
        )}
        <p className="mx-auto mt-3 max-w-xs rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-navy">
          {friendly(firstName(child.name), last?.percentile)}
        </p>
      </div>

      <div className="card-surface p-3">
        {pts.length ? (
          <GrowthChart patient={child} measure={measure} simple height={260} />
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">Sem medidas ainda.</p>
        )}
        <div className="px-2 pb-1 pt-2">
          <GrowthLegend simple />
        </div>
      </div>

      <div className="card-surface divide-y divide-border">
        {[...pts].reverse().map((p) => {
          const ok = p.percentile >= 3 && p.percentile <= 97;
          return (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                <span className="block font-semibold text-navy">{formatDate(p.date)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatAge(child.birthDate, p.date)}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <b className="text-navy">
                  {fmt(p.value, digits(p.value))} {meta.unit}
                </b>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-bold",
                    ok ? "bg-success/12 text-success" : "bg-warning/15 text-[oklch(0.5_0.13_65)]",
                  )}
                >
                  {ok ? "esperado" : "atenção"}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExamsTab({ child }: { child: Patient }) {
  const all = useStore((s) => s.exams);
  const list = useMemo(
    () => all.filter((e) => e.patientId === child.id).sort((a, b) => b.date.localeCompare(a.date)),
    [all, child.id],
  );
  const [viewing, setViewing] = useState<ExamFile | null>(null);
  if (!list.length)
    return (
      <p className="card-surface p-6 text-center text-sm text-muted-foreground">
        Nenhum exame disponível.
      </p>
    );
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-extrabold">Exames e documentos</h2>
      {list.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => setViewing(e)}
          className="card-surface flex items-center gap-3 p-3 text-left"
        >
          <ExamThumb exam={e} className="h-14 w-14 shrink-0 rounded-xl" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold text-navy">{e.name}</span>
            <span className="block text-xs text-muted-foreground">
              {e.category} · {formatDate(e.date)}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      ))}
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
