import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  CalendarClock,
  Check,
  CreditCard,
  Link2,
  MessageSquareText,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, Card, CardHeader, Field, PageHeader } from "@/components/pediflux/ui";
import { Pill } from "@/components/pediflux/StatusBadge";
import { actions, fillMessage, useStore } from "@/data/store";
import type { Settings } from "@/data/types";
import { formatDate } from "@/lib/age";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · PediFlux" },
      { name: "description", content: "Perfil, horários e preferências do consultório." },
    ],
  }),
  component: SettingsPage,
});

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const SECTIONS = [
  { id: "perfil", label: "Perfil e consultório", icon: Building2 },
  { id: "horarios", label: "Horários", icon: CalendarClock },
  { id: "link", label: "Link de agendamento", icon: Link2 },
  { id: "mensagens", label: "Mensagens do WhatsApp", icon: MessageSquareText },
  { id: "assinatura", label: "Minha assinatura", icon: CreditCard },
] as const;

const MSG_META: { key: keyof Settings["messages"]; label: string; hint: string }[] = [
  {
    key: "reminder",
    label: "Lembrete de consulta",
    hint: "{responsavel} {paciente} {quando} {hora} {medico}",
  },
  { key: "return", label: "Convite para retorno", hint: "{responsavel} {paciente}" },
  { key: "result", label: "Resultado de exame", hint: "{responsavel} {paciente}" },
];

function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const [f, setF] = useState(settings);
  useEffect(() => {
    setF(settings);
  }, [settings]);
  const dirty = JSON.stringify(f) !== JSON.stringify(settings);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF((s) => ({ ...s, [k]: v }));

  function save() {
    actions.updateSettings({
      ...f,
      slug: f.slug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-"),
    });
    toast.success("Configurações salvas");
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Seu perfil, horários e preferências"
        actions={
          <Button variant="brand" onClick={save} disabled={!dirty}>
            <Check /> Salvar alterações
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block">
          <ul className="sticky top-24 grid gap-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-card hover:text-navy"
                >
                  <Icon className="h-4 w-4" /> {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid gap-6">
          {/* Perfil */}
          <Card>
            <div id="perfil" className="scroll-mt-24" />
            <CardHeader
              title="Perfil e consultório"
              subtitle="Aparece no link público e no portal da família"
              icon={Building2}
            />
            <div className="grid gap-5 p-5">
              <div className="flex items-center gap-4">
                <Avatar name={f.doctorName} size="lg" />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast("Envio de foto disponível na versão final")}
                  >
                    <UploadCloud /> Trocar foto
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast("Envio de logo disponível na versão final")}
                  >
                    <UploadCloud /> Logo do consultório
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome de exibição">
                  <Input value={f.doctorName} onChange={(e) => set("doctorName", e.target.value)} />
                </Field>
                <Field label="Nome curto (saudações)">
                  <Input
                    value={f.doctorShort}
                    onChange={(e) => set("doctorShort", e.target.value)}
                  />
                </Field>
                <Field label="CRM">
                  <Input value={f.crm} onChange={(e) => set("crm", e.target.value)} />
                </Field>
                <Field label="Especialidade">
                  <Input value={f.specialty} onChange={(e) => set("specialty", e.target.value)} />
                </Field>
                <Field label="Nome do consultório" className="sm:col-span-2">
                  <Input value={f.clinicName} onChange={(e) => set("clinicName", e.target.value)} />
                </Field>
                <Field label="Telefone">
                  <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} />
                </Field>
                <Field label="Endereço">
                  <Input value={f.address} onChange={(e) => set("address", e.target.value)} />
                </Field>
              </div>
            </div>
          </Card>

          {/* Horários */}
          <Card>
            <div id="horarios" className="scroll-mt-24" />
            <CardHeader
              title="Horários de atendimento"
              subtitle="Usados na agenda e no link público"
              icon={CalendarClock}
            />
            <div className="grid gap-4 p-5">
              <Field label="Duração padrão da consulta" className="max-w-xs">
                <Select
                  value={String(f.defaultDuration)}
                  onValueChange={(v) => set("defaultDuration", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 20, 30, 40, 45, 60].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} minutos
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {[1, 2, 3, 4, 5, 6, 0].map((i) => {
                  const d = f.hours[i]!;
                  const update = (patch: Partial<typeof d>) =>
                    set(
                      "hours",
                      f.hours.map((h, j) => (j === i ? { ...h, ...patch } : h)),
                    );
                  return (
                    <li key={i} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <Switch
                        checked={d.enabled}
                        onCheckedChange={(v) => update({ enabled: v })}
                        aria-label={`Atende ${DAYS[i]}`}
                      />
                      <span
                        className={cn(
                          "w-24 font-semibold",
                          d.enabled ? "text-navy" : "text-muted-foreground",
                        )}
                      >
                        {DAYS[i]}
                      </span>
                      {d.enabled ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            step={900}
                            className="h-9 w-28"
                            value={d.start}
                            onChange={(e) => update({ start: e.target.value })}
                          />
                          <span className="text-muted-foreground">até</span>
                          <Input
                            type="time"
                            step={900}
                            className="h-9 w-28"
                            value={d.end}
                            onChange={(e) => update({ end: e.target.value })}
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Fechado</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>

          {/* Link */}
          <Card>
            <div id="link" className="scroll-mt-24" />
            <CardHeader
              title="Link de agendamento"
              subtitle="As famílias escolhem um horário e você confirma"
              icon={Link2}
            />
            <div className="grid gap-3 p-5">
              <Field label="Endereço do seu link">
                <div className="flex overflow-hidden rounded-lg border border-input focus-within:ring-1 focus-within:ring-ring">
                  <span className="hidden items-center bg-muted px-3 text-sm text-muted-foreground sm:flex">
                    pediflux.app/agendar/
                  </span>
                  <input
                    className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                    value={f.slug}
                    onChange={(e) => set("slug", e.target.value)}
                  />
                </div>
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `${window.location.origin}/agendar/${settings.slug}`,
                    );
                    toast.success("Link copiado!");
                  }}
                >
                  Copiar link
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/agendar/${settings.slug}`} target="_blank" rel="noreferrer">
                    Ver página pública
                  </a>
                </Button>
              </div>
            </div>
          </Card>

          {/* Mensagens */}
          <Card>
            <div id="mensagens" className="scroll-mt-24" />
            <CardHeader
              title="Mensagens do WhatsApp"
              subtitle="Textos prontos usados nos botões de envio"
              icon={MessageSquareText}
            />
            <div className="grid gap-5 p-5">
              {MSG_META.map((m) => (
                <div key={m.key} className="grid gap-3 lg:grid-cols-2">
                  <Field label={m.label}>
                    <Textarea
                      rows={4}
                      value={f.messages[m.key]}
                      onChange={(e) => set("messages", { ...f.messages, [m.key]: e.target.value })}
                    />
                    <span className="text-xs font-normal text-muted-foreground">
                      Variáveis: {m.hint}
                    </span>
                  </Field>
                  <div className="rounded-2xl bg-[oklch(0.95_0.03_150)] p-4">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                      Pré-visualização
                    </p>
                    <div className="max-w-sm rounded-2xl rounded-tl-sm bg-card px-3 py-2 text-sm text-navy shadow-soft">
                      {fillMessage(f.messages[m.key], {
                        responsavel: "Maria",
                        paciente: "Pedro",
                        quando: "amanhã",
                        hora: "14h",
                        medico: f.doctorShort,
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Assinatura */}
          <Card className="overflow-hidden">
            <div id="assinatura" className="scroll-mt-24" />
            <CardHeader title="Minha assinatura" icon={CreditCard} />
            <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand text-white shadow-soft">
                  <Sparkles className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-extrabold text-navy">{settings.plan.name}</p>
                    <Pill tone="success">{settings.plan.status}</Pill>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {settings.plan.price} · renova em {formatDate(settings.plan.renewal)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => toast("Gestão da assinatura disponível na versão final")}
              >
                Gerenciar assinatura
              </Button>
            </div>
            <ul className="grid gap-2 border-t border-border bg-muted/40 p-5 text-sm sm:grid-cols-2">
              {[
                "Agenda e link de agendamento",
                "Prontuário com modelos de puericultura",
                "Curvas de crescimento automáticas",
                "Portal da família",
                "Exames e documentos ilimitados",
                "Suporte por WhatsApp",
              ].map((i) => (
                <li key={i} className="flex items-center gap-2 text-navy">
                  <Check className="h-4 w-4 text-success" /> {i}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
