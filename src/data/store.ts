/* eslint-disable @typescript-eslint/no-explicit-any -- linhas do banco chegam sem tipo; o mapeamento banco↔tela é feito à mão neste arquivo. */
/**
 * Camada de dados do PediFlux, ligada ao Supabase.
 *
 * As telas usam apenas `useStore` e `actions` (API síncrona, como antes): cada ação atualiza a
 * tela na hora (otimista) e grava no banco numa fila sequencial. Se uma gravação falhar, o erro
 * aparece num aviso e os dados são recarregados do banco para não ficar nada fora de sincronia.
 *
 * Quem protege os dados é a RLS do banco (supabase/migrations): cada clínica só enxerga o que é dela.
 *
 * Modos:
 *  - "clinic":  área logada do médico (carregada por `ensureClinic`)
 *  - "booking": página pública de agendamento (`loadBooking`)
 *  - "portal":  portal da família (`loadPortal`)
 */
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as typedClient } from "@/integrations/supabase/client";
import type {
  Appointment,
  AppointmentStatus,
  BookingRequest,
  Consultation,
  ExamFile,
  Measurement,
  Patient,
  PlanInfo,
  PlanTier,
  Settings,
  TimeBlock,
  WorkingDay,
} from "./types";
import { addDaysISO, onlyDigits, todayISO } from "@/lib/age";

// O mapeamento banco ↔ tela é feito à mão abaixo; o cliente sem genéricos evita brigar com os tipos.
const sb = typedClient as unknown as SupabaseClient;

export interface NewApptDraft {
  open: boolean;
  patientId?: string;
  date?: string;
  time?: string;
}

export type LoadStatus = "idle" | "loading" | "anon" | "no-clinic" | "ready" | "error";
export type Mode = "clinic" | "booking" | "portal" | null;

export interface State {
  mode: Mode;
  status: LoadStatus;
  clinicId: string | null;
  userEmail: string | null;
  patients: Patient[];
  appointments: Appointment[];
  consultations: Consultation[];
  exams: ExamFile[];
  blocks: TimeBlock[];
  requests: BookingRequest[];
  settings: Settings;
  /** token → telefone da família */
  portalTokens: Record<string, string>;
  /** token aberto no portal (modo "portal") */
  portalToken: string | null;
  ui: { newAppt: NewApptDraft };
}

const DEFAULT_HOURS: WorkingDay[] = [
  { enabled: false, start: "08:00", end: "12:00" },
  { enabled: true, start: "08:00", end: "18:00" },
  { enabled: true, start: "08:00", end: "18:00" },
  { enabled: true, start: "08:00", end: "18:00" },
  { enabled: true, start: "08:00", end: "18:00" },
  { enabled: true, start: "08:00", end: "18:00" },
  { enabled: false, start: "08:00", end: "12:00" },
];

const EMPTY_PLAN: PlanInfo = {
  tier: null,
  name: "",
  status: "",
  writable: false,
  renewalLabel: "",
  price: "",
};

const EMPTY_SETTINGS: Settings = {
  doctorName: "",
  doctorShort: "",
  crm: "",
  specialty: "Pediatria",
  clinicName: "",
  phone: "",
  address: "",
  slug: "",
  defaultDuration: 30,
  hours: DEFAULT_HOURS,
  messages: { reminder: "", return: "", result: "" },
  plan: EMPTY_PLAN,
};

const EMPTY_DATA = {
  clinicId: null,
  patients: [],
  appointments: [],
  consultations: [],
  exams: [],
  blocks: [],
  requests: [],
  settings: EMPTY_SETTINGS,
  portalTokens: {},
  portalToken: null,
} satisfies Partial<State>;

let state: State = {
  mode: null,
  status: "idle",
  userEmail: null,
  ...EMPTY_DATA,
  ui: { newAppt: { open: false } },
};

const listeners = new Set<() => void>();
const initial = state;

function set(fn: (s: State) => Partial<State>) {
  state = { ...state, ...fn(state) };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(initial),
  );
}

export function getState() {
  return state;
}

/* ------------------------------------------------------------------ utilidades */

const uuid = () => crypto.randomUUID();

const hhmm = (t: string | null | undefined) => (t ?? "").slice(0, 5);
const num = (v: unknown) => (v == null ? undefined : Number(v));
const dateOnly = (ts: string | null | undefined) => (ts ? ts.slice(0, 10) : undefined);

/** (31) 98811-2201 — exibição. No banco o telefone é só dígitos. */
export function formatPhone(raw: string): string {
  const d = onlyDigits(raw);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

const samePhone = (a: string, b: string) => onlyDigits(a) === onlyDigits(b);

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function friendlyError(e: unknown): string {
  const msg =
    (e as { message?: string })?.message ?? (typeof e === "string" ? e : "Erro desconhecido");
  if (/row-level security|permission denied/i.test(msg))
    return "Sem permissão para gravar. Confira se a assinatura está ativa.";
  if (/Failed to fetch|NetworkError/i.test(msg)) return "Sem conexão com o servidor.";
  return msg;
}

/** Busca todas as linhas (o Supabase devolve no máximo 1000 por vez). */
async function fetchAll<T>(build: () => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw error;
    out.push(...(data as T[]));
    if (!data || data.length < 1000) return out;
  }
}

/* ------------------------------------------------------------------ fila de gravação */

let queue: Promise<unknown> = Promise.resolve();

/** Grava em ordem (família → paciente → consulta …). Em erro: avisa e recarrega do banco. */
function persist(label: string, job: () => PromiseLike<{ error: unknown } | void>) {
  queue = queue.then(async () => {
    try {
      const r = await job();
      if (r && r.error) throw r.error;
    } catch (e) {
      console.error(`[PediFlux] ${label}`, e);
      toast.error(`Não foi possível salvar (${label})`, { description: friendlyError(e) });
      if (state.mode === "clinic") void loadClinic({ silent: true });
    }
  });
  return queue;
}

/* ------------------------------------------------------------------ mapeamento banco → tela */

const PLAN_NAMES: Record<PlanTier, string> = {
  essencial: "Plano Essencial",
  plus: "Plano Plus",
  pro: "Plano Pro",
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function planInfo(sub: any, prices: any[]): PlanInfo {
  if (!sub) return { ...EMPTY_PLAN, status: "Sem assinatura", name: "Sem plano" };
  const tier = sub.plan as PlanTier;
  const trialOk =
    sub.status === "trial" && (!sub.trial_ends_at || sub.trial_ends_at >= new Date().toISOString());
  const writable = trialOk || sub.status === "active" || sub.status === "past_due";
  const status =
    sub.status === "trial"
      ? trialOk
        ? "Teste grátis"
        : "Teste encerrado"
      : sub.status === "active"
        ? "Ativa"
        : sub.status === "past_due"
          ? "Pagamento pendente"
          : "Cancelada";
  const monthly = prices.find((p) => p.tier === tier && p.billing_interval === "month");
  return {
    tier,
    name: PLAN_NAMES[tier] ?? "Plano",
    status,
    writable,
    renewal: dateOnly(sub.status === "trial" ? sub.trial_ends_at : sub.current_period_end),
    renewalLabel:
      sub.status === "trial" ? (trialOk ? "Teste até" : "Teste terminou em") : "Próxima cobrança",
    price:
      sub.status === "trial"
        ? "Todos os recursos liberados"
        : monthly
          ? `${brl(Number(monthly.amount))}/mês`
          : "",
  };
}

function clinicSettings(c: any, plan: PlanInfo): Settings {
  return {
    doctorName: c.doctor_name ?? "",
    doctorShort: c.doctor_short ?? "",
    crm: c.crm ?? "",
    specialty: c.specialty ?? "Pediatria",
    clinicName: c.name ?? "",
    phone: formatPhone(c.phone ?? ""),
    address: c.address ?? "",
    slug: c.slug ?? "",
    defaultDuration: c.default_duration ?? 30,
    hours: Array.isArray(c.hours) && c.hours.length === 7 ? c.hours : DEFAULT_HOURS,
    messages: {
      reminder: c.messages?.reminder ?? "",
      return: c.messages?.return ?? "",
      result: c.messages?.result ?? "",
    },
    plan,
  };
}

const toMeasurement = (m: any): Measurement => ({
  id: m.id,
  date: m.measured_on ?? m.date,
  weight: num(m.weight),
  height: num(m.height),
  head: num(m.head),
});

function toPatient(p: any, f: any, measurements: Measurement[]): Patient {
  return {
    id: p.id,
    familyId: p.family_id ?? f?.id,
    name: p.name,
    birthDate: p.birth_date,
    sex: p.sex,
    guardianName: f?.guardian_name ?? "",
    guardianRelation: f?.guardian_relation ?? "Mãe",
    phone: formatPhone(f?.phone ?? ""),
    email: f?.email ?? undefined,
    gestationalWeeks: num(p.gestational_weeks),
    birthWeight: num(p.birth_weight),
    birthLength: num(p.birth_length),
    allergies: p.allergies ?? [],
    notes: p.notes ?? undefined,
    measurements,
    nextReturn: p.next_return ?? undefined,
    createdAt: dateOnly(p.created_at) ?? todayISO(),
  };
}

function toConsultation(k: any, m?: Measurement): Consultation {
  const vitals = { hr: num(k.hr), temp: num(k.temp), spo2: num(k.spo2), rr: num(k.rr) };
  return {
    id: k.id,
    patientId: k.patient_id,
    date: k.date,
    type: k.type,
    complaint: k.complaint ?? "",
    anamnesis: k.anamnesis ?? "",
    exam: k.exam ?? "",
    diagnosis: k.diagnosis ?? "",
    plan: k.plan ?? "",
    returnIn: k.return_in ?? undefined,
    measurement: m ? { weight: m.weight, height: m.height, head: m.head } : undefined,
    vitals: Object.values(vitals).some((v) => v != null) ? vitals : undefined,
    sharedWithParent: k.shared_with_family ?? true,
  };
}

const toAppointment = (a: any): Appointment => ({
  id: a.id,
  patientId: a.patient_id,
  date: a.date,
  time: hhmm(a.start_time ?? a.time),
  duration: a.duration ?? 30,
  type: a.type,
  reason: a.reason ?? "",
  status: a.status,
  notes: a.notes ?? undefined,
});

const toExam = (e: any): ExamFile => ({
  id: e.id,
  patientId: e.patient_id,
  name: e.name,
  date: e.taken_on ?? e.date,
  kind: e.kind,
  category: e.category,
  storagePath: e.storage_path ?? undefined,
});

const sortAppts = (a: Appointment[]) =>
  [...a].sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));

/* ------------------------------------------------------------------ carregamento: área do médico */

let loading: Promise<LoadStatus> | null = null;
let lastLoad = 0;

/** Garante a clínica carregada (usado pelo layout logado). */
export function ensureClinic(): Promise<LoadStatus> {
  if (state.mode === "clinic" && state.status === "ready") return Promise.resolve("ready");
  return loadClinic();
}

export function loadClinic(opts: { silent?: boolean } = {}): Promise<LoadStatus> {
  if (loading) return loading;
  if (!opts.silent) set(() => ({ status: "loading" }));
  loading = doLoadClinic()
    .catch((e) => {
      console.error("[PediFlux] carregar clínica", e);
      toast.error("Não foi possível carregar seus dados", { description: friendlyError(e) });
      set(() => ({ status: "error" }));
      return "error" as LoadStatus;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

async function doLoadClinic(): Promise<LoadStatus> {
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) {
    set(() => ({ ...EMPTY_DATA, mode: "clinic", status: "anon", userEmail: null }));
    return "anon";
  }
  const userEmail = session.user.email ?? null;

  const { data: member, error: mErr } = await sb
    .from("clinic_members")
    .select("clinic_id")
    .eq("user_id", session.user.id)
    .limit(1)
    .maybeSingle();
  if (mErr) throw mErr;
  if (!member) {
    set(() => ({ ...EMPTY_DATA, mode: "clinic", status: "no-clinic", userEmail }));
    return "no-clinic";
  }
  const clinicId: string = member.clinic_id;
  const since = addDaysISO(todayISO(), -60);

  const [
    clinic,
    sub,
    prices,
    families,
    patients,
    measurements,
    appts,
    consults,
    exams,
    blocks,
    reqs,
    links,
  ] = await Promise.all([
    sb.from("clinics").select("*").eq("id", clinicId).single(),
    sb.from("subscriptions").select("*").eq("clinic_id", clinicId).maybeSingle(),
    sb.from("billing_plans").select("tier, billing_interval, amount"),
    fetchAll<any>(() => sb.from("families").select("*").eq("clinic_id", clinicId).order("id")),
    fetchAll<any>(() => sb.from("patients").select("*").eq("clinic_id", clinicId).order("id")),
    fetchAll<any>(() =>
      sb
        .from("measurements")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("measured_on")
        .order("id"),
    ),
    fetchAll<any>(() => sb.from("appointments").select("*").eq("clinic_id", clinicId).order("id")),
    fetchAll<any>(() =>
      sb
        .from("consultations")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("date", { ascending: false })
        .order("id"),
    ),
    fetchAll<any>(() => sb.from("exam_files").select("*").eq("clinic_id", clinicId).order("id")),
    fetchAll<any>(() =>
      sb.from("time_blocks").select("*").eq("clinic_id", clinicId).gte("date", since).order("id"),
    ),
    fetchAll<any>(() =>
      sb
        .from("booking_requests")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("status", "pendente")
        .order("id"),
    ),
    fetchAll<any>(() =>
      sb
        .from("portal_links")
        .select("token, family_id")
        .eq("clinic_id", clinicId)
        .is("revoked_at", null)
        .order("id"),
    ),
  ]);
  if (clinic.error) throw clinic.error;
  if (sub.error) throw sub.error;

  const famById = new Map(families.map((f) => [f.id, f]));
  const measByPatient = new Map<string, Measurement[]>();
  const measByConsult = new Map<string, Measurement>();
  for (const m of measurements) {
    const mm = toMeasurement(m);
    if (!measByPatient.has(m.patient_id)) measByPatient.set(m.patient_id, []);
    measByPatient.get(m.patient_id)!.push(mm);
    if (m.consultation_id) measByConsult.set(m.consultation_id, mm);
  }

  const plan = planInfo(sub.data, prices.data ?? []);
  set((s) => ({
    mode: "clinic",
    status: "ready",
    userEmail,
    clinicId,
    settings: clinicSettings(clinic.data, plan),
    patients: patients.map((p) =>
      toPatient(p, famById.get(p.family_id), measByPatient.get(p.id) ?? []),
    ),
    appointments: sortAppts(appts.map(toAppointment)),
    consultations: consults.map((k) => toConsultation(k, measByConsult.get(k.id))),
    exams: exams.map(toExam),
    blocks: blocks.map((b) => ({
      id: b.id,
      date: b.date,
      start: hhmm(b.start_time),
      end: hhmm(b.end_time),
      label: b.label,
    })),
    requests: reqs.map((r) => ({
      id: r.id,
      guardianName: r.guardian_name,
      childName: r.child_name,
      childBirth: r.child_birth,
      phone: formatPhone(r.phone),
      reason: r.reason,
      date: r.date,
      time: hhmm(r.start_time),
      createdAt: dateOnly(r.created_at) ?? todayISO(),
    })),
    portalTokens: Object.fromEntries(
      links.map((l) => [l.token, formatPhone(famById.get(l.family_id)?.phone ?? "")]),
    ),
    portalToken: null,
    ui: s.ui,
  }));
  lastLoad = Date.now();
  return "ready";
}

// Outro aparelho (secretária, celular) pode ter mudado algo: recarrega ao voltar para a aba.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState === "visible" &&
      state.mode === "clinic" &&
      state.status === "ready" &&
      Date.now() - lastLoad > 60_000
    ) {
      void loadClinic({ silent: true });
    }
  });
  sb.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      set(() => ({ ...EMPTY_DATA, mode: null, status: "idle", userEmail: null }));
    }
  });
}

/* ------------------------------------------------------------------ carregamento: páginas públicas */

/** Página pública /agendar/:slug — dados da clínica + horários ocupados (sem nomes). */
export async function loadBooking(slug: string) {
  const { data, error } = await sb.rpc("public_booking_info", { p_slug: slug });
  if (error) console.error("[PediFlux] agenda pública", error);
  const info = data as any;
  if (!info) {
    set(() => ({ ...EMPTY_DATA, mode: "booking", status: "ready" }));
    return;
  }
  set(() => ({
    ...EMPTY_DATA,
    mode: "booking",
    status: "ready",
    settings: { ...clinicSettings(info.clinic, EMPTY_PLAN), slug: slug.toLowerCase() },
    blocks: (info.busy ?? []).map((b: any, i: number) => ({
      id: `busy-${i}`,
      date: b.date,
      start: hhmm(b.start),
      end: hhmm(b.end),
      label: "Ocupado",
    })),
  }));
}

/** Portal da família /p/:token — tudo que a família pode ver, numa chamada. */
export async function loadPortal(token: string) {
  const { data, error } = await sb.rpc("portal_snapshot", { p_token: token });
  if (error) console.error("[PediFlux] portal", error);
  const snap = data as any;
  if (!snap) {
    set(() => ({ ...EMPTY_DATA, mode: "portal", status: "ready", portalToken: token }));
    return;
  }
  const FAMILY = "familia";
  const guardian = {
    guardian_name: snap.guardian?.name ?? "",
    guardian_relation: snap.guardian?.relation,
    phone: FAMILY,
  };
  const children: any[] = snap.children ?? [];
  set(() => ({
    ...EMPTY_DATA,
    mode: "portal",
    status: "ready",
    portalToken: token,
    portalTokens: { [token]: FAMILY },
    settings: clinicSettings(snap.clinic, EMPTY_PLAN),
    patients: children.map((c) =>
      toPatient(
        { ...c, family_id: null },
        { ...guardian, phone: FAMILY },
        (c.measurements ?? []).map(toMeasurement),
      ),
    ),
    consultations: children.flatMap((c) =>
      (c.consultations ?? []).map((k: any) =>
        toConsultation({ ...k, patient_id: c.id, shared_with_family: true }),
      ),
    ),
    appointments: sortAppts(
      children.flatMap((c) =>
        (c.appointments ?? []).map((a: any) => toAppointment({ ...a, patient_id: c.id })),
      ),
    ),
    exams: children.flatMap((c) =>
      (c.exams ?? []).map((e: any) => toExam({ ...e, patient_id: c.id })),
    ),
  }));
}

/* ------------------------------------------------------------------ arquivos de exame */

/** URL temporária (5 min) para ver/baixar um exame. */
export async function examUrl(exam: ExamFile, download = false): Promise<string | null> {
  if (state.mode === "portal") {
    const { data, error } = await sb.functions.invoke("portal-file", {
      body: { token: state.portalToken, exam: exam.id, download },
    });
    if (error || !data?.url) {
      toast.error("Não foi possível abrir o arquivo");
      return null;
    }
    return data.url as string;
  }
  if (!exam.storagePath) return null;
  const { data, error } = await sb.storage
    .from("exams")
    .createSignedUrl(exam.storagePath, 300, download ? { download: exam.name } : undefined);
  if (error) {
    toast.error("Não foi possível abrir o arquivo", { description: friendlyError(error) });
    return null;
  }
  return data.signedUrl;
}

/** Abre o arquivo numa nova aba. A aba é aberta já no clique para o navegador não bloquear. */
export async function openExam(exam: ExamFile, download = false) {
  const w = window.open("about:blank", "_blank");
  if (w) w.opener = null;
  const url = await examUrl(exam, download);
  if (url && w) w.location.href = url;
  else if (url) window.location.assign(url);
  else w?.close();
}

/* ------------------------------------------------------------------ ações */

function familyOf(phone: string) {
  return state.patients.find((p) => p.familyId && samePhone(p.phone, phone));
}

function requireWritable(): boolean {
  if (state.settings.plan.writable) return true;
  toast.error("Sua assinatura não permite novas alterações", {
    description: "Assine um plano para voltar a editar. Seus dados continuam disponíveis.",
    action: { label: "Ver planos", onClick: () => window.location.assign("/planos") },
  });
  return false;
}

export const actions = {
  openNewAppt(draft: Omit<NewApptDraft, "open"> = {}) {
    set(() => ({ ui: { newAppt: { open: true, ...draft } } }));
  },
  closeNewAppt() {
    set(() => ({ ui: { newAppt: { open: false } } }));
  },

  async signOut() {
    await sb.auth.signOut();
    set(() => ({ ...EMPTY_DATA, mode: null, status: "idle", userEmail: null }));
  },

  /* ---------- agenda */
  setStatus(id: string, status: AppointmentStatus) {
    if (!requireWritable()) return;
    set((s) => ({ appointments: s.appointments.map((a) => (a.id === id ? { ...a, status } : a)) }));
    persist("status da consulta", () => sb.from("appointments").update({ status }).eq("id", id));
  },
  addAppointment(a: Omit<Appointment, "id">): Appointment {
    const appt = { ...a, id: uuid() };
    if (!requireWritable()) return appt;
    set((s) => ({ appointments: sortAppts([...s.appointments, appt]) }));
    const clinicId = state.clinicId;
    persist("agendamento", () =>
      sb.from("appointments").insert({
        id: appt.id,
        clinic_id: clinicId,
        patient_id: appt.patientId,
        date: appt.date,
        start_time: appt.time,
        duration: appt.duration,
        type: appt.type,
        reason: appt.reason ?? "",
        status: appt.status,
        notes: appt.notes ?? null,
      }),
    );
    return appt;
  },
  updateAppointment(id: string, patch: Partial<Appointment>) {
    if (!requireWritable()) return;
    set((s) => ({
      appointments: sortAppts(s.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a))),
    }));
    const row: any = {}; // colunas montadas dinamicamente
    if (patch.date !== undefined) row.date = patch.date;
    if (patch.time !== undefined) row.start_time = patch.time;
    if (patch.duration !== undefined) row.duration = patch.duration;
    if (patch.type !== undefined) row.type = patch.type;
    if (patch.reason !== undefined) row.reason = patch.reason;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.notes !== undefined) row.notes = patch.notes ?? null;
    if (patch.patientId !== undefined) row.patient_id = patch.patientId;
    persist("agendamento", () => sb.from("appointments").update(row).eq("id", id));
  },
  removeAppointment(id: string) {
    if (!requireWritable()) return;
    set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) }));
    persist("remover agendamento", () => sb.from("appointments").delete().eq("id", id));
  },

  /* ---------- pacientes */
  addPatient(
    p: Omit<Patient, "id" | "measurements" | "createdAt"> & { measurements?: Measurement[] },
  ): Patient {
    const id = uuid();
    const existing = familyOf(p.phone);
    const familyId = existing?.familyId ?? uuid();
    const measurements: Measurement[] =
      p.measurements ??
      (p.birthWeight || p.birthLength
        ? [{ id: uuid(), date: p.birthDate, weight: p.birthWeight, height: p.birthLength }]
        : []);
    const patient: Patient = {
      ...p,
      id,
      familyId,
      phone: formatPhone(p.phone),
      // irmãos compartilham o responsável cadastrado na família
      ...(existing
        ? {
            guardianName: existing.guardianName,
            guardianRelation: existing.guardianRelation,
            email: existing.email,
          }
        : {}),
      measurements,
      createdAt: todayISO(),
    };
    if (!requireWritable()) return patient;
    set((s) => ({ patients: [...s.patients, patient] }));
    const clinicId = state.clinicId;
    if (!existing) {
      persist("família", () =>
        sb.from("families").insert({
          id: familyId,
          clinic_id: clinicId,
          guardian_name: p.guardianName.trim(),
          guardian_relation: p.guardianRelation,
          phone: onlyDigits(p.phone),
          email: p.email || null,
        }),
      );
    }
    persist("paciente", () =>
      sb.from("patients").insert({
        id,
        clinic_id: clinicId,
        family_id: familyId,
        name: p.name.trim(),
        birth_date: p.birthDate,
        sex: p.sex,
        gestational_weeks: p.gestationalWeeks ?? null,
        birth_weight: p.birthWeight ?? null,
        birth_length: p.birthLength ?? null,
        allergies: p.allergies ?? [],
        notes: p.notes ?? null,
        next_return: p.nextReturn ?? null,
      }),
    );
    for (const m of measurements) {
      persist("medida", () =>
        sb.from("measurements").insert({
          id: m.id,
          clinic_id: clinicId,
          patient_id: id,
          measured_on: m.date,
          weight: m.weight ?? null,
          height: m.height ?? null,
          head: m.head ?? null,
        }),
      );
    }
    return patient;
  },
  updatePatient(id: string, patch: Partial<Patient>) {
    if (!requireWritable()) return;
    const current = state.patients.find((p) => p.id === id);
    if (!current) return;
    const famPatch: Partial<Patient> = {};
    for (const k of ["guardianName", "guardianRelation", "phone", "email"] as const) {
      if (k in patch) (famPatch as any)[k] = k === "phone" ? formatPhone(patch.phone!) : patch[k];
    }
    set((s) => ({
      patients: s.patients.map((p) =>
        p.id === id
          ? { ...p, ...patch, ...famPatch }
          : current.familyId && p.familyId === current.familyId
            ? { ...p, ...famPatch }
            : p,
      ),
    }));

    const row: any = {}; // colunas montadas dinamicamente
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.birthDate !== undefined) row.birth_date = patch.birthDate;
    if (patch.sex !== undefined) row.sex = patch.sex;
    if ("gestationalWeeks" in patch) row.gestational_weeks = patch.gestationalWeeks ?? null;
    if ("birthWeight" in patch) row.birth_weight = patch.birthWeight ?? null;
    if ("birthLength" in patch) row.birth_length = patch.birthLength ?? null;
    if (patch.allergies !== undefined) row.allergies = patch.allergies;
    if ("notes" in patch) row.notes = patch.notes ?? null;
    if ("nextReturn" in patch) row.next_return = patch.nextReturn ?? null;
    if (Object.keys(row).length) {
      persist("paciente", () => sb.from("patients").update(row).eq("id", id));
    }

    const fam: any = {};
    if (famPatch.guardianName !== undefined) fam.guardian_name = famPatch.guardianName;
    if (famPatch.guardianRelation !== undefined) fam.guardian_relation = famPatch.guardianRelation;
    if (famPatch.phone !== undefined) fam.phone = onlyDigits(famPatch.phone);
    if ("email" in famPatch) fam.email = famPatch.email || null;
    if (Object.keys(fam).length && current.familyId) {
      persist("responsável", () => sb.from("families").update(fam).eq("id", current.familyId!));
    }
  },
  addMeasurement(patientId: string, m: Omit<Measurement, "id">, consultationId?: string) {
    if (!requireWritable()) return;
    const mm = { ...m, id: uuid() };
    set((s) => ({
      patients: s.patients.map((p) =>
        p.id === patientId
          ? {
              ...p,
              measurements: [...p.measurements, mm].sort((a, b) => a.date.localeCompare(b.date)),
            }
          : p,
      ),
    }));
    const clinicId = state.clinicId;
    persist("medida", () =>
      sb.from("measurements").insert({
        id: mm.id,
        clinic_id: clinicId,
        patient_id: patientId,
        consultation_id: consultationId ?? null,
        measured_on: m.date,
        weight: m.weight ?? null,
        height: m.height ?? null,
        head: m.head ?? null,
      }),
    );
  },

  /* ---------- prontuário */
  saveConsultation(c: Omit<Consultation, "id"> & { id?: string }) {
    if (!requireWritable()) return;
    const row = {
      date: c.date,
      type: c.type,
      complaint: c.complaint ?? "",
      anamnesis: c.anamnesis ?? "",
      exam: c.exam ?? "",
      diagnosis: c.diagnosis ?? "",
      plan: c.plan ?? "",
      return_in: c.returnIn ?? null,
      hr: c.vitals?.hr ?? null,
      temp: c.vitals?.temp ?? null,
      spo2: c.vitals?.spo2 ?? null,
      rr: c.vitals?.rr ?? null,
      shared_with_family: c.sharedWithParent,
    };
    if (c.id) {
      const id = c.id;
      set((s) => ({
        consultations: s.consultations.map((x) =>
          x.id === id ? ({ ...x, ...c } as Consultation) : x,
        ),
      }));
      persist("consulta", () => sb.from("consultations").update(row).eq("id", id));
      return;
    }
    const nc = { ...c, id: uuid() } as Consultation;
    set((s) => ({ consultations: [nc, ...s.consultations] }));
    const clinicId = state.clinicId;
    persist("consulta", () =>
      sb
        .from("consultations")
        .insert({ ...row, id: nc.id, clinic_id: clinicId, patient_id: c.patientId }),
    );
    if (c.measurement && (c.measurement.weight || c.measurement.height || c.measurement.head)) {
      actions.addMeasurement(c.patientId, { date: c.date, ...c.measurement }, nc.id);
    }
  },

  /* ---------- exames */
  async addExam(e: Omit<ExamFile, "id" | "storagePath">, file: File): Promise<boolean> {
    if (!requireWritable()) return false;
    const clinicId = state.clinicId;
    const id = uuid();
    const safe = file.name
      .normalize("NFD")
      .replace(/[^\w.-]+/g, "_")
      .slice(-80);
    const path = `${clinicId}/${e.patientId}/${id}-${safe}`;
    const up = await sb.storage
      .from("exams")
      .upload(path, file, { contentType: file.type || undefined });
    if (up.error) {
      toast.error(`Falha ao enviar ${file.name}`, { description: friendlyError(up.error) });
      return false;
    }
    const { error } = await sb.from("exam_files").insert({
      id,
      clinic_id: clinicId,
      patient_id: e.patientId,
      name: e.name,
      kind: e.kind,
      category: e.category,
      taken_on: e.date,
      storage_path: path,
      size_bytes: file.size,
    });
    if (error) {
      await sb.storage.from("exams").remove([path]);
      toast.error(`Falha ao registrar ${file.name}`, { description: friendlyError(error) });
      return false;
    }
    set((s) => ({ exams: [{ ...e, id, storagePath: path }, ...s.exams] }));
    return true;
  },
  removeExam(id: string) {
    if (!requireWritable()) return;
    const exam = state.exams.find((x) => x.id === id);
    set((s) => ({ exams: s.exams.filter((e) => e.id !== id) }));
    persist("remover arquivo", async () => {
      const r = await sb.from("exam_files").delete().eq("id", id);
      if (!r.error && exam?.storagePath) await sb.storage.from("exams").remove([exam.storagePath]);
      return r;
    });
  },

  /* ---------- bloqueios de agenda */
  addBlock(b: Omit<TimeBlock, "id">) {
    if (!requireWritable()) return;
    const nb = { ...b, id: uuid() };
    set((s) => ({ blocks: [...s.blocks, nb] }));
    const clinicId = state.clinicId;
    persist("bloqueio", () =>
      sb.from("time_blocks").insert({
        id: nb.id,
        clinic_id: clinicId,
        date: b.date,
        start_time: b.start,
        end_time: b.end,
        label: b.label || "Bloqueio",
      }),
    );
  },
  removeBlock(id: string) {
    if (!requireWritable()) return;
    set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id) }));
    persist("remover bloqueio", () => sb.from("time_blocks").delete().eq("id", id));
  },

  /* ---------- pedidos do link público */
  /** Usado pela página pública. Lança erro com mensagem amigável se o horário não puder ser pedido. */
  async addRequest(r: Omit<BookingRequest, "id" | "createdAt">): Promise<void> {
    const { error } = await sb.rpc("create_booking_request", {
      p_slug: state.settings.slug,
      p_guardian_name: r.guardianName,
      p_child_name: r.childName,
      p_child_birth: r.childBirth,
      p_phone: onlyDigits(r.phone),
      p_reason: r.reason,
      p_date: r.date,
      p_time: r.time,
    });
    if (error) throw new Error(friendlyError(error));
    void loadBooking(state.settings.slug);
  },
  confirmRequest(id: string, override?: { date: string; time: string }) {
    if (!requireWritable()) return;
    const r = state.requests.find((x) => x.id === id);
    if (!r) return;
    let patient = state.patients.find(
      (p) =>
        p.name.trim().toLowerCase() === r.childName.trim().toLowerCase() &&
        samePhone(p.phone, r.phone),
    );
    if (!patient) {
      patient = actions.addPatient({
        name: r.childName,
        birthDate: r.childBirth,
        sex: "M",
        guardianName: r.guardianName,
        guardianRelation: "Mãe",
        phone: r.phone,
        allergies: [],
      });
    }
    actions.addAppointment({
      patientId: patient.id,
      date: override?.date ?? r.date,
      time: override?.time ?? r.time,
      duration: state.settings.defaultDuration,
      type: "Puericultura",
      reason: r.reason,
      status: "confirmado",
    });
    set((s) => ({ requests: s.requests.filter((x) => x.id !== id) }));
    persist("pedido de agendamento", () =>
      sb
        .from("booking_requests")
        .update({ status: "confirmado", handled_at: new Date().toISOString() })
        .eq("id", id),
    );
  },
  rejectRequest(id: string) {
    if (!requireWritable()) return;
    set((s) => ({ requests: s.requests.filter((x) => x.id !== id) }));
    persist("pedido de agendamento", () =>
      sb
        .from("booking_requests")
        .update({ status: "recusado", handled_at: new Date().toISOString() })
        .eq("id", id),
    );
  },

  /* ---------- configurações */
  updateSettings(patch: Partial<Settings>) {
    if (!requireWritable()) return;
    set((s) => ({ settings: { ...s.settings, ...patch } }));
    const row: any = {}; // colunas montadas dinamicamente
    if (patch.doctorName !== undefined) row.doctor_name = patch.doctorName;
    if (patch.doctorShort !== undefined) row.doctor_short = patch.doctorShort;
    if (patch.crm !== undefined) row.crm = patch.crm;
    if (patch.specialty !== undefined) row.specialty = patch.specialty;
    if (patch.clinicName !== undefined) row.name = patch.clinicName;
    if (patch.phone !== undefined) row.phone = onlyDigits(patch.phone);
    if (patch.address !== undefined) row.address = patch.address;
    if (patch.slug !== undefined) row.slug = patch.slug;
    if (patch.defaultDuration !== undefined) row.default_duration = patch.defaultDuration;
    if (patch.hours !== undefined) row.hours = patch.hours;
    if (patch.messages !== undefined) row.messages = patch.messages;
    const clinicId = state.clinicId;
    persist("configurações", () => sb.from("clinics").update(row).eq("id", clinicId));
  },

  /* ---------- portal da família */
  /** Retorna o token do portal da família (gera um novo se ainda não existir). "" se o plano não tiver portal. */
  ensurePortalToken(phone: string): string {
    const existing = portalTokenFor(state, phone);
    if (existing) return existing;
    if (!requireWritable()) return "";
    if (state.settings.plan.tier === "essencial") {
      toast.error("Portal da família disponível nos planos Plus e Pro", {
        action: { label: "Ver planos", onClick: () => window.location.assign("/planos") },
      });
      return "";
    }
    const fam = familyOf(phone);
    if (!fam?.familyId) return "";
    const token = randomToken();
    set((s) => ({ portalTokens: { ...s.portalTokens, [token]: fam.phone } }));
    const clinicId = state.clinicId;
    persist("link do portal", () =>
      sb.from("portal_links").insert({ clinic_id: clinicId, family_id: fam.familyId, token }),
    );
    return token;
  },
  revokePortalToken(phone: string) {
    if (!requireWritable()) return;
    const fam = familyOf(phone);
    set((s) => ({
      portalTokens: Object.fromEntries(
        Object.entries(s.portalTokens).filter(([, ph]) => !samePhone(ph, phone)),
      ),
    }));
    if (!fam?.familyId) return;
    persist("revogar portal", () =>
      sb
        .from("portal_links")
        .update({ revoked_at: new Date().toISOString() })
        .eq("family_id", fam.familyId!)
        .is("revoked_at", null),
    );
  },
};

export const portalTokenFor = (s: State, phone: string) =>
  Object.entries(s.portalTokens).find(([, ph]) => samePhone(ph, phone) || ph === phone)?.[0];

/* Seletores reutilizáveis */
export const siblingsOf = (s: State, p: Patient) =>
  s.patients.filter(
    (x) => x.id !== p.id && (p.familyId ? x.familyId === p.familyId : samePhone(x.phone, p.phone)),
  );

export function fillMessage(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
