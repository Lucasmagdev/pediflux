import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Search, UserPlus, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, Field } from "./ui";
import { actions, fillMessage, getState, useStore } from "@/data/store";
import type { Appointment, AppointmentType, Patient, Sex } from "@/data/types";
import { addDaysISO, firstName, formatAge, formatDate, todayISO, whatsappLink } from "@/lib/age";
import { cn } from "@/lib/utils";

const TYPES: AppointmentType[] = ["Puericultura", "Doença aguda", "Retorno", "Vacina"];

/* ---------------- Nova consulta (global) ---------------- */
export function NewAppointmentDialog() {
  const draft = useStore((s) => s.ui.newAppt);
  const patients = useStore((s) => s.patients);
  const defaultDuration = useStore((s) => s.settings.defaultDuration);
  const [q, setQ] = useState("");
  const [patientId, setPatientId] = useState<string | undefined>();
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(String(defaultDuration));
  const [type, setType] = useState<AppointmentType>("Puericultura");
  const [notes, setNotes] = useState("");
  const [newPatientOpen, setNewPatientOpen] = useState(false);

  useEffect(() => {
    if (draft.open) {
      setPatientId(draft.patientId);
      setDate(draft.date ?? todayISO());
      setTime(draft.time ?? "09:00");
      setDuration(String(defaultDuration));
      setType("Puericultura");
      setNotes("");
      setQ("");
    }
  }, [draft, defaultDuration]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return patients
      .filter(
        (p) => !t || p.name.toLowerCase().includes(t) || p.guardianName.toLowerCase().includes(t),
      )
      .slice(0, 6);
  }, [q, patients]);
  const selected = patients.find((p) => p.id === patientId);

  function submit() {
    if (!patientId) {
      toast.error("Selecione um paciente");
      return;
    }
    actions.addAppointment({
      patientId,
      date,
      time,
      duration: Number(duration),
      type,
      reason: notes || type,
      status: "agendado",
      notes,
    });
    toast.success("Consulta agendada", {
      description: `${selected?.name} · ${formatDate(date)} às ${time}`,
    });
    actions.closeNewAppt();
  }

  return (
    <>
      <Dialog open={draft.open} onOpenChange={(o) => !o && actions.closeNewAppt()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova consulta</DialogTitle>
            <DialogDescription>Agende um atendimento na sua agenda.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Paciente">
              {selected ? (
                <div className="flex items-center gap-3 rounded-lg border border-teal/40 bg-teal/5 p-3">
                  <Avatar name={selected.name} sex={selected.sex} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{selected.name}</p>
                    <p className="text-xs font-normal text-muted-foreground">
                      {formatAge(selected.birthDate)} · {selected.guardianName}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPatientId(undefined)}>
                    Trocar
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Buscar por paciente ou responsável"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                    {filtered.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setPatientId(p.id)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left font-normal hover:bg-accent"
                      >
                        <Avatar name={p.name} sex={p.sex} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{p.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatAge(p.birthDate)} · {p.guardianName}
                          </span>
                        </span>
                      </button>
                    ))}
                    {!filtered.length && (
                      <p className="p-3 text-sm font-normal text-muted-foreground">
                        Nenhum paciente encontrado.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-self-start"
                    onClick={() => setNewPatientOpen(true)}
                  >
                    <UserPlus /> Novo paciente
                  </Button>
                </div>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Data">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Hora">
                <Input
                  type="time"
                  step={900}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </Field>
              <Field label="Duração">
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 20, 30, 45, 60].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Tipo">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-semibold transition",
                      type === t
                        ? "border-teal bg-teal/10 text-teal"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Observação / motivo">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: febre há 2 dias"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => actions.closeNewAppt()}>
              Cancelar
            </Button>
            <Button variant="brand" onClick={submit}>
              Agendar consulta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <NewPatientDialog
        open={newPatientOpen}
        onOpenChange={setNewPatientOpen}
        onCreated={(p) => setPatientId(p.id)}
      />
    </>
  );
}

/* ---------------- Novo paciente ---------------- */
export function NewPatientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (p: Patient) => void;
}) {
  const empty = {
    name: "",
    birthDate: "",
    sex: "" as Sex | "",
    guardianName: "",
    guardianRelation: "Mãe" as Patient["guardianRelation"],
    phone: "",
    email: "",
    gestationalWeeks: "39",
    birthWeight: "",
    birthLength: "",
    notes: "",
  };
  const [f, setF] = useState(empty);
  useEffect(() => {
    if (open) setF(empty);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const up = (k: keyof typeof empty) => (e: { target: { value: string } }) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  function submit() {
    if (!f.name || !f.birthDate || !f.sex || !f.guardianName || !f.phone) {
      toast.error("Preencha nome, nascimento, sexo, responsável e telefone");
      return;
    }
    const p = actions.addPatient({
      name: f.name.trim(),
      birthDate: f.birthDate,
      sex: f.sex as Sex,
      guardianName: f.guardianName.trim(),
      guardianRelation: f.guardianRelation,
      phone: f.phone,
      email: f.email || undefined,
      gestationalWeeks: Number(f.gestationalWeeks) || undefined,
      birthWeight: f.birthWeight ? Number(f.birthWeight.replace(",", ".")) : undefined,
      birthLength: f.birthLength ? Number(f.birthLength.replace(",", ".")) : undefined,
      allergies: [],
      notes: f.notes || undefined,
    });
    const sibs = getState().patients.filter((x) => x.phone === p.phone && x.id !== p.id);
    toast.success("Paciente cadastrado", {
      description: sibs.length
        ? `Vinculado como irmão(ã) de ${sibs.map((s) => firstName(s.name)).join(", ")}`
        : p.name,
    });
    onCreated?.(p);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo paciente</DialogTitle>
          <DialogDescription>
            Os dados de nascimento ajudam a montar a curva de crescimento.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo da criança *" className="sm:col-span-2">
            <Input value={f.name} onChange={up("name")} />
          </Field>
          <Field label="Data de nascimento *">
            <Input type="date" value={f.birthDate} onChange={up("birthDate")} />
          </Field>
          <Field label="Sexo * (para as curvas)">
            <div className="grid grid-cols-2 gap-2">
              {(["F", "M"] as Sex[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setF((x) => ({ ...x, sex: s }))}
                  className={cn(
                    "h-10 rounded-lg border text-sm font-semibold",
                    f.sex === s
                      ? "border-teal bg-teal/10 text-teal"
                      : "border-input text-muted-foreground",
                  )}
                >
                  {s === "F" ? "Feminino" : "Masculino"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Nome do responsável *">
            <Input value={f.guardianName} onChange={up("guardianName")} />
          </Field>
          <Field label="Parentesco">
            <Select
              value={f.guardianRelation}
              onValueChange={(v) =>
                setF((x) => ({ ...x, guardianRelation: v as Patient["guardianRelation"] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Mãe", "Pai", "Responsável"].map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Telefone (WhatsApp) *">
            <Input placeholder="(31) 99999-9999" value={f.phone} onChange={up("phone")} />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={f.email} onChange={up("email")} />
          </Field>
          <Field label="Idade gestacional ao nascer (semanas)">
            <Input
              type="number"
              min={22}
              max={42}
              value={f.gestationalWeeks}
              onChange={up("gestationalWeeks")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peso ao nascer (kg)">
              <Input
                inputMode="decimal"
                placeholder="3,250"
                value={f.birthWeight}
                onChange={up("birthWeight")}
              />
            </Field>
            <Field label="Comprimento (cm)">
              <Input
                inputMode="decimal"
                placeholder="49"
                value={f.birthLength}
                onChange={up("birthLength")}
              />
            </Field>
          </div>
          <Field label="Observações" className="sm:col-span-2">
            <Textarea value={f.notes} onChange={up("notes")} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="brand" onClick={submit}>
            <Check /> Cadastrar paciente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Lembrete WhatsApp ---------------- */
export function WhatsAppReminderDialog({
  appointment,
  onOpenChange,
}: {
  appointment: Appointment | null;
  onOpenChange: (o: boolean) => void;
}) {
  const patients = useStore((s) => s.patients);
  const settings = useStore((s) => s.settings);
  const p = patients.find((x) => x.id === appointment?.patientId);
  const [text, setText] = useState("");
  useEffect(() => {
    if (!appointment || !p) return;
    const today = todayISO();
    const quando =
      appointment.date === today
        ? "hoje"
        : appointment.date === addDaysISO(today, 1)
          ? "amanhã"
          : `em ${formatDate(appointment.date)}`;
    setText(
      fillMessage(settings.messages.reminder, {
        responsavel: firstName(p.guardianName),
        paciente: firstName(p.name),
        quando,
        hora: appointment.time.replace(":00", "h"),
        medico: settings.doctorShort,
      }),
    );
  }, [appointment, p, settings]);

  return (
    <Dialog open={!!appointment} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lembrar pelo WhatsApp</DialogTitle>
          <DialogDescription>
            Para {p?.guardianName} · {p?.phone}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl bg-success/10 p-4">
          <Textarea
            className="min-h-32 border-0 bg-card shadow-soft"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Você pode ajustar o texto antes de enviar.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button variant="success" asChild>
            <a
              href={p ? whatsappLink(p.phone, text) : "#"}
              target="_blank"
              rel="noreferrer"
              onClick={() => onOpenChange(false)}
            >
              <MessageCircle /> Abrir WhatsApp
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Adicionar medição ---------------- */
export function AddMeasurementDialog({
  patient,
  open,
  onOpenChange,
}: {
  patient: Patient;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [f, setF] = useState({ date: todayISO(), weight: "", height: "", head: "" });
  useEffect(() => {
    if (open) setF({ date: todayISO(), weight: "", height: "", head: "" });
  }, [open]);
  const num = (v: string) => (v ? Number(v.replace(",", ".")) : undefined);
  function submit() {
    if (!f.weight && !f.height && !f.head) {
      toast.error("Informe ao menos uma medida");
      return;
    }
    actions.addMeasurement(patient.id, {
      date: f.date,
      weight: num(f.weight),
      height: num(f.height),
      head: num(f.head),
    });
    toast.success("Medição adicionada à curva");
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar medição</DialogTitle>
          <DialogDescription>{patient.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Data">
            <Input
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Peso (kg)">
              <Input
                inputMode="decimal"
                value={f.weight}
                onChange={(e) => setF({ ...f, weight: e.target.value })}
              />
            </Field>
            <Field label="Altura (cm)">
              <Input
                inputMode="decimal"
                value={f.height}
                onChange={(e) => setF({ ...f, height: e.target.value })}
              />
            </Field>
            <Field label="PC (cm)">
              <Input
                inputMode="decimal"
                value={f.head}
                onChange={(e) => setF({ ...f, head: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="brand" onClick={submit}>
            Salvar medição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
