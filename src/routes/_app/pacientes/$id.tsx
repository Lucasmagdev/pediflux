import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Baby,
  CalendarPlus,
  ChevronDown,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  FileText,
  HeartPulse,
  LineChart,
  Link2,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Stethoscope,
  UserRound,
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, Card, CardHeader, EmptyState, Field } from "@/components/pediflux/ui";
import { Pill } from "@/components/pediflux/StatusBadge";
import { ConsultationEditor } from "@/components/pediflux/ConsultationEditor";
import { GrowthPanel } from "@/components/pediflux/GrowthPanel";
import { ExamsPanel } from "@/components/pediflux/ExamsPanel";
import { GrowthDiagnosis, VitalsCard, VitalsHistory } from "@/components/pediflux/HealthOverview";
import { TYPE_STYLE } from "@/components/pediflux/typeStyle";
import { MEASURE_META, type GrowthMeasure } from "@/data/growth-reference";
import { actions, portalTokenFor, siblingsOf, useStore } from "@/data/store";
import type { Consultation, Patient } from "@/data/types";
import { firstName, formatAge, formatDate, todayISO, whatsappLink } from "@/lib/age";
import { fmt, formatPercentile, growthAlert, isPremature, patientPoints } from "@/lib/growth";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "resumo", label: "Resumo", icon: ClipboardList },
  { key: "consultas", label: "Consultas", icon: Stethoscope },
  { key: "crescimento", label: "Crescimento", icon: LineChart },
  { key: "exames", label: "Exames e documentos", icon: FileText },
] as const;
type TabKey = (typeof TABS)[number]["key"];

interface PatientSearch {
  aba?: TabKey;
  nova?: string;
}

export const Route = createFileRoute("/_app/pacientes/$id")({
  validateSearch: (s: Record<string, unknown>): PatientSearch => ({
    aba: TABS.some((t) => t.key === s["aba"]) ? (s["aba"] as TabKey) : undefined,
    nova: typeof s["nova"] === "string" ? s["nova"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ficha do paciente · PediFlux" },
      { name: "description", content: "Prontuário, curva de crescimento e exames." },
    ],
  }),
  component: PatientPage,
});

function PatientPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const patient = useStore((s) => s.patients.find((p) => p.id === id));
  const state = useStore((s) => s);
  const tab: TabKey = search.aba ?? "resumo";
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Consultation | null>(null);
  const [apptId, setApptId] = useState<string | undefined>();
  const [infoOpen, setInfoOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);

  // "Iniciar atendimento" chega com ?nova=<id da consulta agendada>
  useEffect(() => {
    if (search.nova && patient) {
      setEditing(null);
      setApptId(search.nova);
      setEditorOpen(true);
      navigate({
        to: "/pacientes/$id",
        params: { id },
        search: { aba: "consultas" },
        replace: true,
      });
    }
  }, [search.nova, patient, id, navigate]);

  if (!patient) {
    return (
      <Card>
        <EmptyState
          icon={UserRound}
          title="Paciente não encontrado"
          text="Ele pode ter sido removido ou o link está incorreto."
          action={
            <Button variant="brand" asChild>
              <Link to="/pacientes">Ver pacientes</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const siblings = siblingsOf(state, patient);
  const consultations = state.consultations
    .filter((c) => c.patientId === patient.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const setTab = (aba: TabKey) =>
    navigate({ to: "/pacientes/$id", params: { id }, search: { aba }, replace: true });

  function newConsult() {
    setEditing(null);
    setApptId(undefined);
    setEditorOpen(true);
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <Link
        to="/pacientes"
        className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Pacientes
      </Link>

      {/* Cabeçalho */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-brand sm:h-24" />
        <div className="-mt-10 px-5 sm:-mt-11 sm:px-6">
          <div className="inline-block rounded-full bg-card p-1.5 shadow-soft">
            <Avatar name={patient.name} sex={patient.sex} size="lg" />
          </div>
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5 pt-2 sm:flex-row sm:items-end sm:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold">{patient.name}</h1>
            <p className="text-sm text-muted-foreground">
              {formatAge(patient.birthDate)} · {patient.sex === "F" ? "Feminino" : "Masculino"} ·
              nasc. {formatDate(patient.birthDate)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {isPremature(patient) && (
                <Pill tone="info">
                  <Baby className="h-3 w-3" /> Prematuro · {patient.gestationalWeeks} semanas
                </Pill>
              )}
              {patient.allergies.map((a) => (
                <Pill key={a} tone="danger">
                  <AlertTriangle className="h-3 w-3" /> Alergia: {a}
                </Pill>
              ))}
              {patient.nextReturn && (
                <Pill tone={patient.nextReturn < todayISO() ? "danger" : "teal"}>
                  Retorno {formatDate(patient.nextReturn)}
                  {patient.nextReturn < todayISO() && " (atrasado)"}
                </Pill>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-success" asChild>
              <a
                href={whatsappLink(patient.phone, `Olá, ${firstName(patient.guardianName)}!`)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle /> WhatsApp
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPortalOpen(true)}>
              <Link2 /> Portal da família
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.openNewAppt({ patientId: patient.id })}
            >
              <CalendarPlus /> Agendar
            </Button>
            <Button variant="brand" size="sm" onClick={newConsult}>
              <Plus /> Novo atendimento
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border px-5 py-3 text-sm sm:px-6">
          <span className="flex items-center gap-2 text-muted-foreground">
            <UserRound className="h-4 w-4" /> {patient.guardianRelation}:{" "}
            <b className="text-navy">{patient.guardianName}</b>
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" /> {patient.phone}
          </span>
          {siblings.length > 0 && (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Irmãos:</span>
              {siblings.map((s) => (
                <Link
                  key={s.id}
                  to="/pacientes/$id"
                  params={{ id: s.id }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/8 py-0.5 pl-0.5 pr-2.5 text-xs font-semibold text-teal hover:bg-teal/15"
                >
                  <Avatar name={s.name} sex={s.sex} size="sm" />
                  {firstName(s.name)} · {formatAge(s.birthDate)}
                </Link>
              ))}
            </span>
          )}
        </div>
      </Card>

      {/* Abas */}
      <div className="no-print -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex min-w-full gap-1 border-b border-border sm:min-w-0">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition",
                tab === key
                  ? "border-teal text-navy"
                  : "border-transparent text-muted-foreground hover:text-navy",
              )}
            >
              <Icon className={cn("h-4 w-4", tab === key && "text-teal")} /> {label}
              {key === "consultas" && (
                <span className="rounded-full bg-muted px-1.5 text-xs">{consultations.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "resumo" && (
        <SummaryTab
          patient={patient}
          consultations={consultations}
          onEditInfo={() => setInfoOpen(true)}
          goTab={setTab}
        />
      )}
      {tab === "consultas" && (
        <ConsultationsTab
          consultations={consultations}
          onNew={newConsult}
          onEdit={(c) => {
            setEditing(c);
            setApptId(undefined);
            setEditorOpen(true);
          }}
        />
      )}
      {tab === "crescimento" && <GrowthPanel patient={patient} />}
      {tab === "exames" && <ExamsPanel patient={patient} />}

      <ConsultationEditor
        patient={patient}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editing={editing}
        appointmentId={apptId}
      />
      <ClinicalInfoDialog patient={patient} open={infoOpen} onOpenChange={setInfoOpen} />
      <PortalDialog patient={patient} open={portalOpen} onOpenChange={setPortalOpen} />
    </div>
  );
}

/* ---------------- Resumo ---------------- */
function SummaryTab({
  patient,
  consultations,
  onEditInfo,
  goTab,
}: {
  patient: Patient;
  consultations: Consultation[];
  onEditInfo: () => void;
  goTab: (t: TabKey) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
        <GrowthDiagnosis patient={patient} onOpen={() => goTab("crescimento")} />
        <VitalsCard consultations={consultations} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <VitalsHistory consultations={consultations} />
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold">Informações clínicas</h2>
            <Button variant="ghost" size="sm" onClick={onEditInfo}>
              <Pencil /> Editar
            </Button>
          </div>
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Alergias
              </dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {patient.allergies.length ? (
                  patient.allergies.map((a) => (
                    <Pill key={a} tone="danger">
                      {a}
                    </Pill>
                  ))
                ) : (
                  <span className="text-muted-foreground">Nenhuma conhecida</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Observações
              </dt>
              <dd className="mt-1 text-navy">
                {patient.notes || <span className="text-muted-foreground">—</span>}
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="p-5 md:col-span-2 xl:col-span-1">
          <h2 className="mb-3 text-base font-bold">Nascimento</h2>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {(
              [
                [
                  "Idade gest.",
                  patient.gestationalWeeks ? `${patient.gestationalWeeks} sem` : "—",
                  "bg-lavender",
                ],
                [
                  "Peso",
                  patient.birthWeight ? `${fmt(patient.birthWeight, 3)} kg` : "—",
                  "bg-peach",
                ],
                [
                  "Comprimento",
                  patient.birthLength ? `${fmt(patient.birthLength)} cm` : "—",
                  "bg-sky",
                ],
              ] as const
            ).map(([k, v, bg]) => (
              <div key={k} className={cn("rounded-2xl p-3", bg)}>
                <dt className="text-[11px] font-semibold uppercase text-muted-foreground">{k}</dt>
                <dd className="mt-1 text-sm font-extrabold text-navy">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">Últimos atendimentos</h2>
          <Button variant="ghost" size="sm" onClick={() => goTab("consultas")}>
            Ver todos
          </Button>
        </div>
        {consultations.length ? (
          <ul className="grid grid-cols-1 gap-3">
            {consultations.slice(0, 3).map((c) => {
              const st = TYPE_STYLE[c.type];
              return (
                <li key={c.id} className="grid grid-cols-[56px_1fr] items-center gap-3">
                  <div className="text-center">
                    <p className="text-lg font-extrabold leading-none text-navy">
                      {c.date.slice(8, 10)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.date).slice(3)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goTab("consultas")}
                    className={cn(
                      "flex min-w-0 items-center gap-3 rounded-2xl p-3 text-left transition hover:brightness-[0.98]",
                      st.bg,
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
                      <span className="block truncate text-sm font-bold text-navy">
                        {c.diagnosis}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.type} · {c.plan}
                      </span>
                    </span>
                    {c.vitals?.hr != null && (
                      <span className="hidden shrink-0 rounded-full bg-card/80 px-2.5 py-1 text-xs font-bold text-navy sm:inline">
                        {c.vitals.hr} bpm
                        {c.vitals.temp != null && ` · ${fmt(c.vitals.temp, 1)} °C`}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={Stethoscope} title="Nenhum atendimento registrado" />
        )}
      </Card>
    </div>
  );
}

/* ---------------- Consultas ---------------- */
function ConsultationsTab({
  consultations,
  onNew,
  onEdit,
}: {
  consultations: Consultation[];
  onNew: () => void;
  onEdit: (c: Consultation) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(consultations[0]?.id ?? null);

  if (!consultations.length) {
    return (
      <Card>
        <EmptyState
          icon={Stethoscope}
          title="Nenhum atendimento ainda"
          text="Registre a primeira consulta usando um dos modelos prontos de puericultura."
          action={
            <Button variant="brand" onClick={onNew}>
              <Plus /> Novo atendimento
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {consultations.length} atendimentos no prontuário
        </p>
        <Button variant="brand" onClick={onNew}>
          <Plus /> Novo atendimento
        </Button>
      </div>
      <ol className="relative grid gap-4 border-l-2 border-border pl-6 sm:ml-2">
        {consultations.map((c) => {
          const open = openId === c.id;
          return (
            <li key={c.id} className="relative">
              <span
                className={cn(
                  "absolute -left-[33px] top-5 h-4 w-4 rounded-full border-4 border-surface",
                  c.type === "Doença aguda" ? "bg-warning" : "bg-teal",
                )}
              />
              <Card className={cn("transition", open && "shadow-lift")}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : c.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-navy">{formatDate(c.date)}</span>
                      <Pill
                        tone={
                          c.type === "Doença aguda"
                            ? "warning"
                            : c.type === "Vacina"
                              ? "info"
                              : "teal"
                        }
                      >
                        {c.type}
                      </Pill>
                      {c.sharedWithParent ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="h-3 w-3" /> visível à família
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <EyeOff className="h-3 w-3" /> interno
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {c.diagnosis || c.complaint}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition",
                      open && "rotate-180",
                    )}
                  />
                </button>
                {open && (
                  <div className="border-t border-border px-5 py-4 animate-fade-up">
                    {c.measurement && (c.measurement.weight || c.measurement.height) && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {c.measurement.weight && (
                          <Pill tone="neutral">
                            Peso {fmt(c.measurement.weight, c.measurement.weight < 20 ? 3 : 1)} kg
                          </Pill>
                        )}
                        {c.measurement.height && (
                          <Pill tone="neutral">Altura {fmt(c.measurement.height)} cm</Pill>
                        )}
                        {c.measurement.head && (
                          <Pill tone="neutral">PC {fmt(c.measurement.head)} cm</Pill>
                        )}
                      </div>
                    )}
                    <dl className="grid gap-4 text-sm sm:grid-cols-2">
                      {[
                        ["Queixa principal", c.complaint],
                        ["Anamnese", c.anamnesis],
                        ["Exame físico", c.exam],
                        ["Diagnóstico", c.diagnosis],
                        ["Conduta", c.plan],
                        ["Retorno", c.returnIn],
                      ].map(([k, v]) =>
                        v ? (
                          <div
                            key={k}
                            className={cn(
                              k === "Anamnese" || k === "Exame físico" ? "sm:col-span-2" : "",
                            )}
                          >
                            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {k}
                            </dt>
                            <dd className="mt-1 whitespace-pre-line text-navy">{v}</dd>
                          </div>
                        ) : null,
                      )}
                    </dl>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(c)}>
                        <Pencil /> Editar
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------------- Alergias e observações ---------------- */
function ClinicalInfoDialog({
  patient,
  open,
  onOpenChange,
}: {
  patient: Patient;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (open) {
      setAllergies(patient.allergies.join(", "));
      setNotes(patient.notes ?? "");
    }
  }, [open, patient]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Informações clínicas</DialogTitle>
          <DialogDescription>{patient.name}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4">
          <Field label="Alergias (separe por vírgula)">
            <Input
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Ex.: Amoxicilina, Dipirona"
            />
          </Field>
          <Field label="Observações fixas">
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="brand"
            onClick={() => {
              actions.updatePatient(patient.id, {
                allergies: allergies
                  .split(",")
                  .map((a) => a.trim())
                  .filter(Boolean),
                notes: notes.trim() || undefined,
              });
              toast.success("Informações atualizadas");
              onOpenChange(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Portal da família ---------------- */
function PortalDialog({
  patient,
  open,
  onOpenChange,
}: {
  patient: Patient;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const token = useStore((s) => portalTokenFor(s, patient.phone));
  const url = useMemo(() => (token ? `${window.location.origin}/p/${token}` : ""), [token]);
  const text = `Olá, ${firstName(patient.guardianName)}! Este é o portal do(a) ${firstName(patient.name)}: consultas, curva de crescimento e exames num só lugar. Salve na tela inicial do celular: ${url}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Portal da família</DialogTitle>
          <DialogDescription>
            Acesso sem senha, por link exclusivo da família{" "}
            {patient.guardianName.split(" ").slice(-1)[0]}.
          </DialogDescription>
        </DialogHeader>
        {token ? (
          <div className="grid gap-3">
            <div className="truncate rounded-xl bg-muted px-3 py-2.5 font-mono text-xs text-navy">
              {url.replace(/^https?:\/\//, "")}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(url);
                  toast.success("Link copiado!");
                }}
              >
                <Copy /> Copiar
              </Button>
              <Button variant="outline" asChild>
                <a href={`/p/${token}`} target="_blank" rel="noreferrer">
                  <Eye /> Ver como a mãe
                </a>
              </Button>
            </div>
            <Button variant="success" asChild>
              <a href={whatsappLink(patient.phone, text)} target="_blank" rel="noreferrer">
                <MessageCircle /> Enviar link pelo WhatsApp
              </a>
            </Button>
            <button
              type="button"
              className="justify-self-start text-xs font-semibold text-destructive hover:underline"
              onClick={() => {
                actions.revokePortalToken(patient.phone);
                toast("Link revogado. O acesso antigo deixou de funcionar.");
              }}
            >
              Revogar link
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              A família ainda não tem acesso. Gere um link para a mãe acompanhar consultas,
              crescimento e exames de todos os filhos.
            </p>
            <Button
              variant="brand"
              onClick={() => {
                actions.ensurePortalToken(patient.phone);
                toast.success("Link gerado");
              }}
            >
              <Link2 /> Gerar link de acesso
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
