/**
 * Curvas de crescimento da OMS pelo método LMS (Box-Cox), com os parâmetros oficiais:
 *   0–5 anos: WHO Child Growth Standards (2006) · 5–19 anos: WHO Growth Reference 2007.
 * Tabelas em ./who-lms.ts (um ponto por mês; entre meses, L, M e S são interpolados).
 *
 *   valor no escore z:  X = M · (1 + L·S·z)^(1/L)        (L = 0 → M · e^(S·z))
 *   escore z do valor:  z = ((X/M)^L − 1) / (L·S)        (L = 0 → ln(X/M) / S)
 *
 * Para peso e IMC a OMS restringe a extrapolação além de ±3 DP (linha reta entre ±2 e ±3 DP);
 * isso é aplicado em `zScore`.
 */
import type { Sex } from "./types";
import { WHO_LMS } from "./who-lms";

export type GrowthMeasure = "weight" | "height" | "head" | "bmi";

type Lms = [l: number, m: number, s: number];

/** Último mês com referência OMS para a medida. */
const LAST_MONTH: Record<GrowthMeasure, number> = {
  weight: 120,
  height: 228,
  head: 60,
  bmi: 228,
};

/** L, M e S na idade (meses, fracionária), ou null fora da faixa coberta pela OMS. */
function lmsAt(sex: Sex, measure: GrowthMeasure, age: number): Lms | null {
  if (!Number.isFinite(age) || age < 0 || age > LAST_MONTH[measure]) return null;
  const t = WHO_LMS[measure][sex];
  const i = Math.min(Math.floor(age), LAST_MONTH[measure] - 1);
  const f = Math.min(age - i, 1);
  const at = (k: number, j: number) => t[k * 3 + j]!;
  return [0, 1, 2].map((j) => at(i, j) + f * (at(i + 1, j) - at(i, j))) as Lms;
}

function valueAtZ([l, m, s]: Lms, z: number): number {
  return Math.abs(l) < 1e-7 ? m * Math.exp(s * z) : m * Math.pow(1 + l * s * z, 1 / l);
}

export function medianValue(sex: Sex, measure: GrowthMeasure, age: number): number {
  return lmsAt(sex, measure, age)?.[1] ?? NaN;
}

/** Valor da medida no escore z indicado (usado para desenhar as linhas de percentil). */
export function referenceValue(sex: Sex, measure: GrowthMeasure, age: number, z: number): number {
  const lms = lmsAt(sex, measure, age);
  return lms ? valueAtZ(lms, z) : NaN;
}

/** Escore z oficial da OMS. NaN se a idade estiver fora da faixa da referência. */
export function zScore(sex: Sex, measure: GrowthMeasure, age: number, value: number): number {
  const lms = lmsAt(sex, measure, age);
  if (!lms || !(value > 0)) return NaN;
  const [l, m, s] = lms;
  const z = Math.abs(l) < 1e-7 ? Math.log(value / m) / s : (Math.pow(value / m, l) - 1) / (l * s);
  if ((measure === "weight" || measure === "bmi") && Math.abs(z) > 3) {
    const sd3 = valueAtZ(lms, Math.sign(z) * 3);
    const sd2 = valueAtZ(lms, Math.sign(z) * 2);
    return Math.sign(z) * 3 + (value - sd3) / Math.abs(sd3 - sd2);
  }
  return z;
}

function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function percentileFromZ(z: number): number {
  return Math.max(0.1, Math.min(99.9, normCdf(z) * 100));
}

export const PERCENTILE_LINES = [
  { key: "p3", label: "P3", z: -1.881 },
  { key: "p15", label: "P15", z: -1.036 },
  { key: "p50", label: "P50", z: 0 },
  { key: "p85", label: "P85", z: 1.036 },
  { key: "p97", label: "P97", z: 1.881 },
] as const;

/** Faixa de percentil mais próxima (para frases como "Caiu de P50 para P15") */
export function nearestLine(z: number): string {
  let best: string = PERCENTILE_LINES[0].label;
  let dist = Infinity;
  for (const l of PERCENTILE_LINES) {
    const d = Math.abs(l.z - z);
    if (d < dist) {
      dist = d;
      best = l.label;
    }
  }
  return best;
}

export function lineIndex(z: number): number {
  return PERCENTILE_LINES.findIndex((l) => l.label === nearestLine(z));
}

export const MEASURE_META: Record<
  GrowthMeasure,
  { label: string; short: string; unit: string; maxAge: number }
> = {
  weight: { label: "Peso x idade", short: "Peso", unit: "kg", maxAge: LAST_MONTH.weight },
  height: {
    label: "Comprimento/Estatura x idade",
    short: "Altura",
    unit: "cm",
    maxAge: LAST_MONTH.height,
  },
  head: { label: "Perímetro cefálico x idade", short: "PC", unit: "cm", maxAge: LAST_MONTH.head },
  bmi: { label: "IMC x idade", short: "IMC", unit: "kg/m²", maxAge: LAST_MONTH.bmi },
};
