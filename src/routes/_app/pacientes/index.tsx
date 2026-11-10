import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, MessageCircle, Search, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, Card, EmptyState, PageHeader } from "@/components/pediflux/ui";
import { Pill } from "@/components/pediflux/StatusBadge";
import { NewPatientDialog } from "@/components/pediflux/dialogs";
import { useStore } from "@/data/store";
import type { Patient } from "@/data/types";
import { ageInMonths, formatAge, formatDate, todayISO, whatsappLink } from "@/lib/age";
import { growthAlert, isPremature } from "@/lib/growth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/pacientes/")({
  head: () => ({
    meta: [
      { title: "Pacientes · PediFlux" },
      { name: "description", content: "Lista de pacientes do consultório." },
    ],
  }),
  component: PatientsPage,
});

const AGE_FILTERS = [
  { key: "todos", label: "Todas as idades", test: () => true },
  { key: "rn", label: "Recém-nascidos (até 28 dias)", test: (m: number) => m < 0.92 },
  { key: "lactente", label: "Lactentes (até 2 anos)", test: (m: number) => m < 24 },
  { key: "pre", label: "Pré-escolares (2 a 6 anos)", test: (m: number) => m >= 24 && m < 72 },
  { key: "escolar", label: "Escolares (6+ anos)", test: (m: number) => m >= 72 },
] as const;

const SORTS = [
  { key: "nome", label: "Nome (A–Z)" },
  { key: "ultima", label: "Última consulta" },
  { key: "retorno", label: "Próximo retorno" },
  { key: "idade", label: "Mais novos primeiro" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

function PatientsPage() {
  const patients = useStore((s) => s.patients);
  const consultations = useStore((s) => s.consultations);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [age, setAge] = useState<string>("todos");
  const [sort, setSort] = useState<SortKey>("nome");
  const [newOpen, setNewOpen] = useState(false);
  const today = todayISO();

  const lastVisit = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of consultations)
      if (!map.get(c.patientId) || map.get(c.patientId)! < c.date) map.set(c.patientId, c.date);
    return map;
  }, [consultations]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = AGE_FILTERS.find((x) => x.key === age) ?? AGE_FILTERS[0];
    const list = patients.filter(
      (p) =>
        (!t ||
          p.name.toLowerCase().includes(t) ||
          p.guardianName.toLowerCase().includes(t) ||
          p.phone.includes(t)) &&
        f.test(ageInMonths(p.birthDate)),
    );
    const by: Record<SortKey, (a: Patient, b: Patient) => number> = {
      nome: (a, b) => a.name.localeCompare(b.name),
      ultima: (a, b) => (lastVisit.get(b.id) ?? "").localeCompare(lastVisit.get(a.id) ?? ""),
      retorno: (a, b) => (a.nextReturn ?? "9999").localeCompare(b.nextReturn ?? "9999"),
      idade: (a, b) => b.birthDate.localeCompare(a.birthDate),
    };
    return [...list].sort(by[sort]);
  }, [patients, q, age, sort, lastVisit]);

  const siblingsCount = (p: Patient) =>
    patients.filter((x) => x.id !== p.id && x.phone === p.phone).length;

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle={`${patients.length} crianças acompanhadas`}
        actions={
          <Button variant="brand" onClick={() => setNewOpen(true)}>
            <UserPlus /> Novo paciente
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por criança, responsável ou telefone"
              className="h-10 pl-9"
            />
          </div>
          <Select value={age} onValueChange={setAge}>
            <SelectTrigger className="h-10 md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGE_FILTERS.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-10 md:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum paciente encontrado"
            text={
              q
                ? `Nada para “${q}”. Confira a grafia ou cadastre um novo paciente.`
                : "Ajuste os filtros para ver seus pacientes."
            }
            action={
              <Button variant="brand" onClick={() => setNewOpen(true)}>
                <UserPlus /> Novo paciente
              </Button>
            }
          />
        ) : (
          <>
            {/* Tabela (desktop) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Paciente</th>
                    <th className="px-3 py-3 font-semibold">Idade</th>
                    <th className="px-3 py-3 font-semibold">Responsável</th>
                    <th className="px-3 py-3 font-semibold">Última consulta</th>
                    <th className="px-3 py-3 font-semibold">Próximo retorno</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((p) => {
                    const alert = growthAlert(p, "weight");
                    const sibs = siblingsCount(p);
                    const overdue = p.nextReturn && p.nextReturn < today;
                    return (
                      <tr
                        key={p.id}
                        className="cursor-pointer transition hover:bg-muted/50"
                        onClick={() => navigate({ to: "/pacientes/$id", params: { id: p.id } })}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={p.name} sex={p.sex} />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-navy">{p.name}</p>
                              <div className="mt-0.5 flex flex-wrap gap-1">
                                {isPremature(p) && (
                                  <Pill tone="info">Prematuro {p.gestationalWeeks}s</Pill>
                                )}
                                {sibs > 0 && (
                                  <Pill tone="teal">
                                    {sibs} irmão{sibs > 1 ? "s" : ""}
                                  </Pill>
                                )}
                                {alert && (
                                  <Pill tone={alert.level === "danger" ? "danger" : "warning"}>
                                    Curva
                                  </Pill>
                                )}
                                {p.allergies.length > 0 && <Pill tone="danger">Alergia</Pill>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-navy">{formatAge(p.birthDate)}</td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-navy">{p.guardianName}</p>
                          <p className="text-xs text-muted-foreground">{p.phone}</p>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {formatDate(lastVisit.get(p.id))}
                        </td>
                        <td className="px-3 py-3">
                          {p.nextReturn ? (
                            <span
                              className={cn(
                                "font-medium",
                                overdue ? "text-destructive" : "text-navy",
                              )}
                            >
                              {formatDate(p.nextReturn)}
                              {overdue && <span className="block text-xs">atrasado</span>}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-success"
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <a
                                href={whatsappLink(
                                  p.phone,
                                  `Olá, ${p.guardianName.split(" ")[0]}!`,
                                )}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="WhatsApp do responsável"
                              >
                                <MessageCircle />
                              </a>
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cartões (celular) */}
            <ul className="divide-y divide-border md:hidden">
              {rows.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/pacientes/$id"
                    params={{ id: p.id }}
                    className="flex items-center gap-3 px-4 py-3 active:bg-muted"
                  >
                    <Avatar name={p.name} sex={p.sex} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-navy">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatAge(p.birthDate)} · {p.guardianName}
                      </p>
                      {p.nextReturn && (
                        <p className="text-xs font-medium text-teal">
                          Retorno {formatDate(p.nextReturn)}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <NewPatientDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(p) => navigate({ to: "/pacientes/$id", params: { id: p.id } })}
      />
    </div>
  );
}
