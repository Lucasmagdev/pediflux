/** Modelos de prontuário (texto pronto para o médico editar). */

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
