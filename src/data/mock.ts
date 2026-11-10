/**
 * Dados fictícios de demonstração. Tudo aqui é substituível por um banco real:
 * as telas só conhecem o formato definido em ./types.ts e as ações do ./store.ts.
 */
import { addDaysISO, todayISO, timeToMin } from "@/lib/age";
import { referenceValue } from "./growth-reference";
import type {
  Appointment,
  BookingRequest,
  Consultation,
  ExamFile,
  Measurement,
  Patient,
  Settings,
  Sex,
  TimeBlock,
} from "./types";

const T = todayISO();

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

interface Seed {
  id: string;
  name: string;
  sex: Sex;
  ageDays: number;
  guardian: string;
  relation?: "Mãe" | "Pai" | "Responsável";
  phone: string;
  email?: string;
  z: number;
  /** z a partir de certa idade (meses) para simular queda de percentil */
  dropFrom?: { month: number; z: number };
  ga?: number;
  allergies?: string[];
  notes?: string;
}

const SEEDS: Seed[] = [
  {
    id: "p1",
    name: "Pedro Almeida",
    sex: "M",
    ageDays: 830,
    guardian: "Maria Almeida",
    phone: "(31) 98811-2201",
    email: "maria.almeida@email.com",
    z: 0.3,
    allergies: ["Amoxicilina"],
    notes: "Rinite alérgica leve.",
  },
  {
    id: "p2",
    name: "Ana Almeida",
    sex: "F",
    ageDays: 2210,
    guardian: "Maria Almeida",
    phone: "(31) 98811-2201",
    email: "maria.almeida@email.com",
    z: 0.6,
  },
  {
    id: "p3",
    name: "João Ferreira",
    sex: "M",
    ageDays: 245,
    guardian: "Carla Ferreira",
    phone: "(31) 99702-3345",
    email: "carla.f@email.com",
    z: -0.2,
  },
  {
    id: "p4",
    name: "Laura Ferreira",
    sex: "F",
    ageDays: 1490,
    guardian: "Carla Ferreira",
    phone: "(31) 99702-3345",
    email: "carla.f@email.com",
    z: 0.1,
    allergies: ["Proteína do leite de vaca (resolvida)"],
  },
  {
    id: "p5",
    name: "Helena Costa",
    sex: "F",
    ageDays: 152,
    guardian: "Juliana Costa",
    phone: "(31) 98455-7810",
    z: -0.4,
    ga: 32,
    notes: "Prematura de 32 semanas. Acompanhamento com oftalmologia (ROP) e fono.",
  },
  {
    id: "p6",
    name: "Miguel Rocha",
    sex: "M",
    ageDays: 12,
    guardian: "Fernanda Rocha",
    phone: "(31) 99123-4567",
    z: 0.2,
  },
  {
    id: "p7",
    name: "Sofia Martins",
    sex: "F",
    ageDays: 550,
    guardian: "Patrícia Martins",
    phone: "(31) 98234-1199",
    z: 0.05,
    dropFrom: { month: 15, z: -1.05 },
    notes: "Seletividade alimentar relatada pela mãe.",
  },
  {
    id: "p8",
    name: "Davi Oliveira",
    sex: "M",
    ageDays: 1110,
    guardian: "Rafael Oliveira",
    relation: "Pai",
    phone: "(31) 99877-6655",
    z: 1.0,
    allergies: ["Dipirona"],
  },
  {
    id: "p9",
    name: "Valentina Lima",
    sex: "F",
    ageDays: 3300,
    guardian: "Camila Lima",
    phone: "(31) 98666-2020",
    z: -0.7,
  },
  {
    id: "p10",
    name: "Arthur Souza Pereira",
    sex: "M",
    ageDays: 4400,
    guardian: "Luciana Pereira",
    phone: "(31) 99555-8080",
    z: 0.5,
    notes: "Asma intermitente. Usa salbutamol se necessário.",
  },
  {
    id: "p11",
    name: "Beatriz Carvalho",
    sex: "F",
    ageDays: 305,
    guardian: "Aline Carvalho",
    phone: "(31) 98111-3030",
    z: 1.2,
  },
  {
    id: "p12",
    name: "Gabriel Nunes",
    sex: "M",
    ageDays: 2600,
    guardian: "Tatiane Nunes",
    phone: "(31) 99444-1212",
    z: -0.1,
  },
];

const VISIT_MONTHS = [
  0, 0.5, 1, 2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144,
];

function buildMeasurements(s: Seed, birth: string): Measurement[] {
  const rnd = seeded(s.id.length * 997 + s.ageDays);
  const ageMonths = s.ageDays / 30.4375;
  const corr = s.ga ? ((40 - s.ga) * 7) / 30.4375 : 0;
  const visits = VISIT_MONTHS.filter((m) => m <= ageMonths - 0.1);
  if (s.ageDays < 20) visits.splice(0, visits.length, 0);
  if (s.ageDays >= 20 && visits[visits.length - 1] < ageMonths - 1)
    visits.push(Math.floor(ageMonths * 10) / 10 - 0.3);
  return visits.map((m, i) => {
    const date = addDaysISO(birth, Math.round(m * 30.4375));
    const refAge = Math.max(0, m - corr);
    const z = s.dropFrom && m >= s.dropFrom.month ? s.dropFrom.z : s.z;
    const j = () => (rnd() - 0.5) * 0.25;
    const weight = referenceValue(s.sex, "weight", refAge, z + j());
    const height = referenceValue(s.sex, "height", refAge, z * 0.8 + j());
    const head = m <= 60 ? referenceValue(s.sex, "head", refAge, z * 0.6 + j()) : undefined;
    return {
      id: `${s.id}-m${i}`,
      date,
      weight: Math.round(weight * (m < 24 ? 1000 : 10)) / (m < 24 ? 1000 : 10),
      height: Math.round(height * 10) / 10,
      head: head ? Math.round(head * 10) / 10 : undefined,
    };
  });
}

export const mockPatients: Patient[] = SEEDS.map((s, idx) => {
  const birth = addDaysISO(T, -s.ageDays);
  const measurements = buildMeasurements(s, birth);
  const first = measurements[0];
  return {
    id: s.id,
    name: s.name,
    birthDate: birth,
    sex: s.sex,
    guardianName: s.guardian,
    guardianRelation: s.relation ?? "Mãe",
    phone: s.phone,
    email: s.email,
    gestationalWeeks: s.ga ?? 39,
    birthWeight: first?.weight,
    birthLength: first?.height,
    allergies: s.allergies ?? [],
    notes: s.notes,
    measurements,
    nextReturn: idx % 3 === 2 ? undefined : addDaysISO(T, 7 + idx * 5),
    createdAt: idx === 5 || idx === 4 ? T : addDaysISO(birth, 3),
  };
});

const TEMPLATES = {
  Puericultura: {
    complaint: "Consulta de rotina (puericultura).",
    anamnesis:
      "Mãe sem queixas. Alimentação adequada para a idade. Sono regular. Eliminações fisiológicas normais. Vacinação em dia.",
    exam: "BEG, corado, hidratado, acianótico, anictérico. ACV: RCR 2T BNF. AR: MV+ sem RA. Abdome flácido, indolor, sem visceromegalias. Desenvolvimento neuropsicomotor adequado.",
    diagnosis: "Criança saudável. Crescimento e desenvolvimento adequados.",
    plan: "Orientações sobre alimentação, sono e prevenção de acidentes. Manter vitamina D. Conferir calendário vacinal.",
    returnIn: "Retorno em 2 meses",
  },
  "Doença aguda": {
    complaint: "Febre há 2 dias e coriza.",
    anamnesis:
      "Febre até 38,5 °C, coriza hialina e tosse seca. Aceitando bem líquidos. Sem dispneia.",
    exam: "BEG, febril (38,1 °C). Orofaringe hiperemiada sem exsudato. Otoscopia normal. AR: MV+ sem RA, sem esforço.",
    diagnosis: "Infecção de vias aéreas superiores (IVAS) — provável etiologia viral.",
    plan: "Lavagem nasal com SF 0,9%. Antitérmico se febre. Sinais de alarme orientados. Retornar se febre > 72 h.",
    returnIn: "Retorno se necessário",
  },
  Retorno: {
    complaint: "Retorno para reavaliação.",
    anamnesis: "Melhora clínica completa. Sem febre há 4 dias.",
    exam: "BEG, afebril, eupneico. Exame físico sem alterações.",
    diagnosis: "Quadro resolvido.",
    plan: "Alta do quadro agudo. Manter seguimento de puericultura.",
    returnIn: "Próxima puericultura conforme calendário",
  },
  Vacina: {
    complaint: "Avaliação pré-vacinal.",
    anamnesis: "Sem intercorrências desde a última dose.",
    exam: "Sem alterações.",
    diagnosis: "Apto a vacinar.",
    plan: "Encaminhado à sala de vacinas. Orientado sobre reações esperadas.",
    returnIn: "Conforme calendário",
  },
} as const;

export interface ConsultTemplateData {
  complaint: string;
  anamnesis: string;
  exam: string;
  diagnosis: string;
  plan: string;
  returnIn: string;
}

export const CONSULT_TEMPLATES: {
  name: string;
  type: keyof typeof TEMPLATES;
  data: ConsultTemplateData;
}[] = [
  {
    name: "Puericultura 1 mês",
    type: "Puericultura",
    data: {
      ...TEMPLATES.Puericultura,
      anamnesis:
        "Aleitamento materno exclusivo, mamando a cada 2–3 h. Coto umbilical caído. Teste do pezinho, orelhinha e olhinho normais.",
      plan: "Manter aleitamento exclusivo. Iniciar vitamina D 400 UI/dia. Vacinas do 2º mês.",
      returnIn: "Retorno com 2 meses",
    },
  },
  {
    name: "Puericultura 6 meses",
    type: "Puericultura",
    data: {
      ...TEMPLATES.Puericultura,
      anamnesis:
        "Iniciou alimentação complementar. Aceita frutas e papa salgada. Senta com apoio. Balbucia.",
      plan: "Orientada introdução alimentar (sem sal, açúcar ou mel). Ferro profilático. Vacinas dos 6 meses.",
      returnIn: "Retorno com 9 meses",
    },
  },
  { name: "Infecção de vias aéreas", type: "Doença aguda", data: TEMPLATES["Doença aguda"] },
  { name: "Retorno", type: "Retorno", data: TEMPLATES.Retorno },
];

export const mockConsultations: Consultation[] = mockPatients.flatMap((p) => {
  const ms = p.measurements.slice(-4);
  return ms
    .map((m, i) => {
      const type: keyof typeof TEMPLATES =
        i === ms.length - 2 && ms.length > 2 ? "Doença aguda" : "Puericultura";
      const tpl = TEMPLATES[type];
      return {
        id: `${p.id}-c${i}`,
        patientId: p.id,
        date: m.date,
        type,
        ...tpl,
        measurement: { weight: m.weight, height: m.height, head: m.head },
        sharedWithParent: type === "Puericultura",
      };
    })
    .reverse();
});

const EXAM_NAMES: [string, ExamFile["kind"], ExamFile["category"]][] = [
  ["Hemograma completo", "pdf", "Exame de sangue"],
  ["Ultrassom transfontanela", "image", "Imagem"],
  ["Ferritina e vitamina D", "pdf", "Exame de sangue"],
  ["Raio-X de tórax", "image", "Imagem"],
  ["Receita — vitamina D", "pdf", "Receita"],
  ["Teste do pezinho", "pdf", "Laudo"],
  ["Atestado escolar", "pdf", "Atestado"],
];

export const mockExams: ExamFile[] = mockPatients.flatMap((p, pi) =>
  EXAM_NAMES.filter((_, i) => (i + pi) % 3 !== 0)
    .slice(0, 2 + (pi % 3))
    .map(([name, kind, category], i) => ({
      id: `${p.id}-e${i}`,
      patientId: p.id,
      name,
      kind,
      category,
      date: addDaysISO(T, -(15 + i * 37 + pi * 3)),
    })),
);

const TODAY_SLOTS: [string, string, Appointment["type"], string, Appointment["status"]][] = [
  ["p6", "08:00", "Puericultura", "Primeira consulta do recém-nascido", "atendido"],
  ["p3", "08:30", "Puericultura", "Puericultura 8 meses", "atendido"],
  ["p7", "09:00", "Retorno", "Reavaliar ganho de peso", "faltou"],
  ["p5", "09:30", "Puericultura", "Seguimento do prematuro", "em_atendimento"],
  ["p1", "10:30", "Doença aguda", "Febre e tosse há 2 dias", "aguardando"],
  ["p11", "11:00", "Vacina", "Avaliação pré-vacinal 10 meses", "confirmado"],
  ["p8", "14:00", "Puericultura", "Consulta anual 3 anos", "confirmado"],
  ["p10", "15:00", "Retorno", "Controle da asma", "agendado"],
  ["p9", "16:00", "Doença aguda", "Dor de ouvido", "agendado"],
];

export const mockAppointments: Appointment[] = [
  ...TODAY_SLOTS.map(([patientId, time, type, reason, status], i) => ({
    id: `a-today-${i}`,
    patientId,
    date: T,
    time,
    duration: 30,
    type,
    reason,
    status,
  })),
  ...[1, 2, 3, 4, -1, -2].flatMap((d, k) =>
    ["08:30", "10:00", "14:30", "16:00"].slice(0, 2 + (k % 3)).map((time, j) => {
      const p = mockPatients[(k * 3 + j + 2) % mockPatients.length];
      return {
        id: `a-${d}-${j}`,
        patientId: p.id,
        date: addDaysISO(T, d),
        time,
        duration: 30,
        type: (["Puericultura", "Retorno", "Doença aguda", "Vacina"] as const)[(j + k) % 4],
        reason: [
          "Puericultura de rotina",
          "Retorno de exames",
          "Tosse persistente",
          "Avaliação pré-vacinal",
        ][(j + k) % 4],
        status: (d < 0 ? "atendido" : j % 2 ? "agendado" : "confirmado") as Appointment["status"],
      };
    }),
  ),
].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

export const mockBlocks: TimeBlock[] = [0, 1, 2, 3, 4].map((d) => ({
  id: `b-lunch-${d}`,
  date: addDaysISO(T, d),
  start: "12:00",
  end: "13:30",
  label: "Almoço",
}));

export const mockRequests: BookingRequest[] = [
  {
    id: "r1",
    guardianName: "Renata Batista",
    childName: "Lucas Batista",
    childBirth: addDaysISO(T, -420),
    phone: "(31) 98777-1010",
    reason: "Primeira consulta — mudamos de cidade",
    date: addDaysISO(T, 1),
    time: "09:00",
    createdAt: addDaysISO(T, -1),
  },
  {
    id: "r2",
    guardianName: "Carla Ferreira",
    childName: "Laura Ferreira",
    childBirth: mockPatients[3].birthDate,
    phone: "(31) 99702-3345",
    reason: "Tosse há 5 dias",
    date: addDaysISO(T, 1),
    time: "15:30",
    createdAt: T,
  },
  {
    id: "r3",
    guardianName: "Bruno Teixeira",
    childName: "Alice Teixeira",
    childBirth: addDaysISO(T, -75),
    phone: "(31) 99333-4545",
    reason: "Puericultura 2 meses",
    date: addDaysISO(T, 2),
    time: "10:30",
    createdAt: T,
  },
];

export const mockSettings: Settings = {
  doctorName: "Dra. Marina Souza",
  doctorShort: "Dra. Marina",
  crm: "CRM-MG 00000",
  specialty: "Pediatria e Puericultura",
  clinicName: "Consultório Pediátrico Marina Souza",
  phone: "(31) 3333-4444",
  address: "Rua dos Ipês, 250, sala 804 — Savassi, Belo Horizonte/MG",
  slug: "dra-marina",
  defaultDuration: 30,
  hours: [
    { enabled: false, start: "08:00", end: "12:00" },
    { enabled: true, start: "08:00", end: "18:00" },
    { enabled: true, start: "08:00", end: "18:00" },
    { enabled: true, start: "08:00", end: "18:00" },
    { enabled: true, start: "08:00", end: "18:00" },
    { enabled: true, start: "08:00", end: "17:00" },
    { enabled: true, start: "08:00", end: "12:00" },
  ],
  messages: {
    reminder:
      "Olá, {responsavel}! Lembrando da consulta do(a) {paciente} {quando} às {hora} com a {medico}. Por favor, confirme respondendo esta mensagem. 💙",
    return:
      "Olá, {responsavel}! Está chegando a hora do retorno do(a) {paciente}. Vamos agendar? Responda com o melhor dia e horário.",
    result:
      "Olá, {responsavel}! Os resultados dos exames do(a) {paciente} já estão disponíveis. Qualquer dúvida, estamos à disposição.",
  },
  plan: { name: "PediFlux Pro", status: "Ativa", renewal: addDaysISO(T, 23), price: "R$ 149/mês" },
};

/** Acesso do portal da mãe por link: token -> telefone do responsável */
export const mockPortalTokens: Record<string, string> = {
  abc123: "(31) 98811-2201",
  fer456: "(31) 99702-3345",
  hel789: "(31) 98455-7810",
};

export function slotsTaken(date: string, appts: Appointment[]) {
  return new Set(appts.filter((a) => a.date === date).map((a) => timeToMin(a.time)));
}
