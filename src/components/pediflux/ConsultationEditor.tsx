import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, FileText, Ruler, Sparkles } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "./ui";
import { CONSULT_TEMPLATES } from "@/data/mock";
import { actions } from "@/data/store";
import type { AppointmentType, Consultation, Patient } from "@/data/types";
import { formatAge, todayISO } from "@/lib/age";
import { bmiOf, fmt } from "@/lib/growth";
import { cn } from "@/lib/utils";

const TYPES: AppointmentType[] = ["Puericultura", "Doença aguda", "Retorno", "Vacina"];

const EMPTY = {
  date: todayISO(),
  type: "Puericultura" as AppointmentType,
  complaint: "",
  anamnesis: "",
  exam: "",
  diagnosis: "",
  plan: "",
  returnIn: "",
  nextReturn: "",
  weight: "",
  height: "",
  head: "",
  sharedWithParent: true,
};

const SECTIONS = [
  { key: "complaint", label: "Queixa principal", rows: 2, placeholder: "Motivo da consulta" },
  {
    key: "anamnesis",
    label: "Anamnese",
    rows: 4,
    placeholder: "História, alimentação, sono, eliminações, vacinação…",
  },
  {
    key: "exam",
    label: "Exame físico",
    rows: 4,
    placeholder: "Estado geral, aparelhos, desenvolvimento…",
  },
  { key: "diagnosis", label: "Diagnóstico / hipótese", rows: 2, placeholder: "" },
  {
    key: "plan",
    label: "Conduta e prescrição",
    rows: 4,
    placeholder: "Orientações, medicações, exames solicitados…",
  },
] as const;

export function ConsultationEditor({
  patient,
  open,
  onOpenChange,
  editing,
  appointmentId,
}: {
  patient: Patient;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Consultation | null;
  appointmentId?: string;
}) {
  const [f, setF] = useState(EMPTY);
  const [template, setTemplate] = useState<string | null>(null);
  const toStr = (n?: number) => (n == null ? "" : String(n).replace(".", ","));

  useEffect(() => {
    if (!open) return;
    setTemplate(null);
    if (editing) {
      setF({
        ...EMPTY,
        date: editing.date,
        type: editing.type,
        complaint: editing.complaint,
        anamnesis: editing.anamnesis,
        exam: editing.exam,
        diagnosis: editing.diagnosis,
        plan: editing.plan,
        returnIn: editing.returnIn ?? "",
        weight: toStr(editing.measurement?.weight),
        height: toStr(editing.measurement?.height),
        head: toStr(editing.measurement?.head),
        sharedWithParent: editing.sharedWithParent,
      });
    } else {
      setF({ ...EMPTY, date: todayISO(), nextReturn: patient.nextReturn ?? "" });
    }
  }, [open, editing, patient.nextReturn]);

  const num = (v: string) => (v.trim() ? Number(v.replace(",", ".")) : undefined);
  const bmi = bmiOf({ weight: num(f.weight), height: num(f.height) });

  function applyTemplate(name: string) {
    const t = CONSULT_TEMPLATES.find((x) => x.name === name);
    if (!t) return;
    setTemplate(name);
    setF((s) => ({ ...s, type: t.type, ...t.data }));
  }

  function save() {
    if (!f.complaint.trim() && !f.diagnosis.trim()) {
      toast.error("Preencha ao menos a queixa ou o diagnóstico");
      return;
    }
    const measurement = { weight: num(f.weight), height: num(f.height), head: num(f.head) };
    actions.saveConsultation({
      id: editing?.id,
      patientId: patient.id,
      date: f.date,
      type: f.type,
      complaint: f.complaint,
      anamnesis: f.anamnesis,
      exam: f.exam,
      diagnosis: f.diagnosis,
      plan: f.plan,
      returnIn: f.returnIn || undefined,
      measurement:
        measurement.weight || measurement.height || measurement.head ? measurement : undefined,
      sharedWithParent: f.sharedWithParent,
    });
    if (f.nextReturn) actions.updatePatient(patient.id, { nextReturn: f.nextReturn });
    if (appointmentId) actions.setStatus(appointmentId, "atendido");
    toast.success(editing ? "Atendimento atualizado" : "Atendimento salvo no prontuário", {
      description:
        measurement.weight || measurement.height
          ? "Medidas adicionadas à curva de crescimento."
          : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar atendimento" : "Novo atendimento"}</DialogTitle>
          <DialogDescription>
            {patient.name} · {formatAge(patient.birthDate, f.date)}
          </DialogDescription>
        </DialogHeader>

        {!editing && (
          <div className="rounded-2xl border border-teal/30 bg-teal/5 p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-navy">
              <Sparkles className="h-4 w-4 text-teal" /> Modelos prontos
            </p>
            <div className="flex flex-wrap gap-2">
              {CONSULT_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => applyTemplate(t.name)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    template === t.name
                      ? "border-teal bg-teal text-white"
                      : "border-border bg-card text-navy hover:border-teal/50",
                  )}
                >
                  <FileText className="h-3.5 w-3.5" /> {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <Field label="Data">
            <Input
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
          <Field label="Tipo">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setF({ ...f, type: t })}
                  className={cn(
                    "h-10 rounded-lg border px-2 text-xs font-semibold transition",
                    f.type === t
                      ? "border-teal bg-teal/10 text-teal"
                      : "border-input text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Medidas */}
        <div className="rounded-2xl bg-muted/60 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-navy">
            <Ruler className="h-4 w-4 text-teal" /> Medidas do dia
            <span className="font-normal text-muted-foreground">(vão direto para a curva)</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Peso (kg)">
              <Input
                inputMode="decimal"
                placeholder="0,000"
                value={f.weight}
                onChange={(e) => setF({ ...f, weight: e.target.value })}
              />
            </Field>
            <Field label="Altura (cm)">
              <Input
                inputMode="decimal"
                placeholder="0,0"
                value={f.height}
                onChange={(e) => setF({ ...f, height: e.target.value })}
              />
            </Field>
            <Field label="PC (cm)">
              <Input
                inputMode="decimal"
                placeholder="0,0"
                value={f.head}
                onChange={(e) => setF({ ...f, head: e.target.value })}
              />
            </Field>
            <Field label="IMC">
              <div className="flex h-10 items-center rounded-lg border border-dashed border-input bg-card px-3 text-sm font-semibold text-navy">
                {bmi ? `${fmt(bmi, 1)} kg/m²` : "—"}
              </div>
            </Field>
          </div>
        </div>

        <div className="grid gap-4">
          {SECTIONS.map((s) => (
            <Field key={s.key} label={s.label}>
              <Textarea
                rows={s.rows}
                placeholder={s.placeholder}
                value={f[s.key]}
                onChange={(e) => setF({ ...f, [s.key]: e.target.value })}
              />
            </Field>
          ))}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Orientação de retorno">
              <Input
                placeholder="Ex.: Retorno em 2 meses"
                value={f.returnIn}
                onChange={(e) => setF({ ...f, returnIn: e.target.value })}
              />
            </Field>
            <Field label="Data do próximo retorno">
              <Input
                type="date"
                value={f.nextReturn}
                onChange={(e) => setF({ ...f, nextReturn: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
            <span className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-teal">
                <Eye className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-bold text-navy">
                  Mostrar no portal da família
                </span>
                <span className="block text-xs text-muted-foreground">
                  A mãe vê data, tipo, diagnóstico e orientações (sem anotações clínicas internas).
                </span>
              </span>
            </span>
            <Switch
              checked={f.sharedWithParent}
              onCheckedChange={(v) => setF({ ...f, sharedWithParent: v })}
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="brand" onClick={save}>
            {appointmentId ? "Salvar e finalizar atendimento" : "Salvar atendimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
