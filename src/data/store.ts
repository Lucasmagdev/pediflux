/**
 * Camada de dados em memória. As telas usam apenas `useStore` e `actions`.
 * Para trocar por um banco real, reimplemente as ações mantendo as assinaturas.
 */
import { useSyncExternalStore } from "react";
import {
  mockAppointments,
  mockBlocks,
  mockConsultations,
  mockExams,
  mockPatients,
  mockPortalTokens,
  mockRequests,
  mockSettings,
} from "./mock";
import type {
  Appointment,
  AppointmentStatus,
  BookingRequest,
  Consultation,
  ExamFile,
  Measurement,
  Patient,
  Settings,
  TimeBlock,
} from "./types";
import { todayISO } from "@/lib/age";

export interface NewApptDraft {
  open: boolean;
  patientId?: string;
  date?: string;
  time?: string;
}

export interface State {
  patients: Patient[];
  appointments: Appointment[];
  consultations: Consultation[];
  exams: ExamFile[];
  blocks: TimeBlock[];
  requests: BookingRequest[];
  settings: Settings;
  portalTokens: Record<string, string>;
  ui: { newAppt: NewApptDraft };
}

let state: State = {
  patients: mockPatients,
  appointments: mockAppointments,
  consultations: mockConsultations,
  exams: mockExams,
  blocks: mockBlocks,
  requests: mockRequests,
  settings: mockSettings,
  portalTokens: mockPortalTokens,
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

let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

const sortAppts = (a: Appointment[]) =>
  [...a].sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));

export const actions = {
  openNewAppt(draft: Omit<NewApptDraft, "open"> = {}) {
    set(() => ({ ui: { newAppt: { open: true, ...draft } } }));
  },
  closeNewAppt() {
    set(() => ({ ui: { newAppt: { open: false } } }));
  },
  setStatus(id: string, status: AppointmentStatus) {
    set((s) => ({ appointments: s.appointments.map((a) => (a.id === id ? { ...a, status } : a)) }));
  },
  addAppointment(a: Omit<Appointment, "id">): Appointment {
    const appt = { ...a, id: uid("a") };
    set((s) => ({ appointments: sortAppts([...s.appointments, appt]) }));
    return appt;
  },
  updateAppointment(id: string, patch: Partial<Appointment>) {
    set((s) => ({
      appointments: sortAppts(s.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a))),
    }));
  },
  removeAppointment(id: string) {
    set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) }));
  },
  addPatient(
    p: Omit<Patient, "id" | "measurements" | "createdAt"> & { measurements?: Measurement[] },
  ): Patient {
    const id = uid("p");
    const measurements: Measurement[] =
      p.measurements ??
      (p.birthWeight || p.birthLength
        ? [{ id: uid("m"), date: p.birthDate, weight: p.birthWeight, height: p.birthLength }]
        : []);
    const patient: Patient = { ...p, id, measurements, createdAt: todayISO() };
    set((s) => ({ patients: [...s.patients, patient] }));
    return patient;
  },
  updatePatient(id: string, patch: Partial<Patient>) {
    set((s) => ({ patients: s.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  },
  addMeasurement(patientId: string, m: Omit<Measurement, "id">) {
    set((s) => ({
      patients: s.patients.map((p) =>
        p.id === patientId
          ? {
              ...p,
              measurements: [...p.measurements, { ...m, id: uid("m") }].sort((a, b) =>
                a.date.localeCompare(b.date),
              ),
            }
          : p,
      ),
    }));
  },
  saveConsultation(c: Omit<Consultation, "id"> & { id?: string }) {
    if (c.id) {
      set((s) => ({
        consultations: s.consultations.map((x) =>
          x.id === c.id ? ({ ...x, ...c } as Consultation) : x,
        ),
      }));
      return;
    }
    const nc = { ...c, id: uid("c") } as Consultation;
    set((s) => ({ consultations: [nc, ...s.consultations] }));
    if (c.measurement && (c.measurement.weight || c.measurement.height || c.measurement.head)) {
      actions.addMeasurement(c.patientId, { date: c.date, ...c.measurement });
    }
  },
  addExam(e: Omit<ExamFile, "id">) {
    set((s) => ({ exams: [{ ...e, id: uid("e") }, ...s.exams] }));
  },
  addBlock(b: Omit<TimeBlock, "id">) {
    set((s) => ({ blocks: [...s.blocks, { ...b, id: uid("b") }] }));
  },
  removeBlock(id: string) {
    set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id) }));
  },
  addRequest(r: Omit<BookingRequest, "id" | "createdAt">) {
    set((s) => ({ requests: [...s.requests, { ...r, id: uid("r"), createdAt: todayISO() }] }));
  },
  confirmRequest(id: string, override?: { date: string; time: string }) {
    const r = state.requests.find((x) => x.id === id);
    if (!r) return;
    let patient = state.patients.find((p) => p.name === r.childName && p.phone === r.phone);
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
  },
  rejectRequest(id: string) {
    set((s) => ({ requests: s.requests.filter((x) => x.id !== id) }));
  },
  updateSettings(patch: Partial<Settings>) {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
  },
  removeExam(id: string) {
    set((s) => ({ exams: s.exams.filter((e) => e.id !== id) }));
  },
  /** Retorna o token do portal da família (gera um novo se ainda não existir). */
  ensurePortalToken(phone: string): string {
    const existing = Object.entries(state.portalTokens).find(([, ph]) => ph === phone)?.[0];
    if (existing) return existing;
    const token = Math.random().toString(36).slice(2, 8);
    set((s) => ({ portalTokens: { ...s.portalTokens, [token]: phone } }));
    return token;
  },
  revokePortalToken(phone: string) {
    set((s) => ({
      portalTokens: Object.fromEntries(
        Object.entries(s.portalTokens).filter(([, ph]) => ph !== phone),
      ),
    }));
  },
};

export const portalTokenFor = (s: State, phone: string) =>
  Object.entries(s.portalTokens).find(([, ph]) => ph === phone)?.[0];

/* Seletores reutilizáveis */
export const siblingsOf = (s: State, p: Patient) =>
  s.patients.filter((x) => x.id !== p.id && x.phone === p.phone);

export function fillMessage(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
