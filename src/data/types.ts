export type Sex = "M" | "F";

export type AppointmentStatus =
  "agendado" | "confirmado" | "aguardando" | "em_atendimento" | "atendido" | "faltou";

export type AppointmentType = "Puericultura" | "Doença aguda" | "Retorno" | "Vacina";

export interface Measurement {
  id: string;
  date: string; // ISO
  weight?: number; // kg
  height?: number; // cm
  head?: number; // cm
}

export interface Consultation {
  id: string;
  patientId: string;
  date: string;
  type: AppointmentType;
  complaint: string;
  anamnesis: string;
  exam: string;
  diagnosis: string;
  plan: string;
  returnIn?: string;
  measurement?: Omit<Measurement, "id" | "date">;
  sharedWithParent: boolean;
}

export interface ExamFile {
  id: string;
  patientId: string;
  name: string;
  date: string;
  kind: "pdf" | "image";
  category: "Exame de sangue" | "Imagem" | "Laudo" | "Receita" | "Atestado" | "Outro";
}

export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  sex: Sex;
  guardianName: string;
  guardianRelation: "Mãe" | "Pai" | "Responsável";
  phone: string;
  email?: string;
  gestationalWeeks?: number;
  birthWeight?: number;
  birthLength?: number;
  allergies: string[];
  notes?: string;
  measurements: Measurement[];
  nextReturn?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  date: string;
  time: string;
  duration: number;
  type: AppointmentType;
  reason: string;
  status: AppointmentStatus;
  notes?: string;
}

export interface TimeBlock {
  id: string;
  date: string;
  start: string;
  end: string;
  label: string;
}

export interface BookingRequest {
  id: string;
  guardianName: string;
  childName: string;
  childBirth: string;
  phone: string;
  reason: string;
  date: string;
  time: string;
  createdAt: string;
}

export interface WorkingDay {
  enabled: boolean;
  start: string;
  end: string;
}

export interface Settings {
  doctorName: string;
  doctorShort: string;
  crm: string;
  specialty: string;
  clinicName: string;
  phone: string;
  address: string;
  slug: string;
  defaultDuration: number;
  hours: WorkingDay[]; // index 0 = domingo
  messages: { reminder: string; return: string; result: string };
  plan: { name: string; status: "Ativa"; renewal: string; price: string };
}
