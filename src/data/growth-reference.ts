/**
 * Dados de referência APROXIMADOS para demonstração.
 * Substitua por tabelas oficiais da OMS (LMS) mantendo a mesma interface:
 *   referenceValue(sex, measure, ageMonths, z)
 */
import type { Sex } from "./types";

export type GrowthMeasure = "weight" | "height" | "head" | "bmi";

const AGES = [0, 1, 2, 3, 4, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156];

const MEDIANS: Record<Exclude<GrowthMeasure, "bmi">, Record<Sex, number[]>> = {
  weight: {
    M: [
      3.3, 4.5, 5.6, 6.4, 7.0, 7.9, 8.9, 9.6, 10.9, 12.2, 14.3, 16.3, 18.3, 20.5, 22.9, 25.4, 28.1,
      31.2, 35.0, 39.0, 44.0,
    ],
    F: [
      3.2, 4.2, 5.1, 5.8, 6.4, 7.3, 8.2, 8.9, 10.2, 11.5, 13.9, 16.1, 18.2, 20.2, 22.4, 25.0, 28.2,
      31.9, 36.0, 41.0, 45.5,
    ],
  },
  height: {
    M: [
      49.9, 54.7, 58.4, 61.4, 63.9, 67.6, 72.0, 75.7, 82.3, 87.8, 96.1, 103.3, 110.0, 116.0, 121.7,
      127.3, 132.6, 137.8, 143.1, 149.1, 156.0,
    ],
    F: [
      49.1, 53.7, 57.1, 59.8, 62.1, 65.7, 70.1, 74.0, 80.7, 86.4, 95.1, 102.7, 109.4, 115.1, 120.8,
      126.6, 132.5, 138.6, 144.8, 151.2, 156.4,
    ],
  },
  head: {
    M: [
      34.5, 37.3, 39.1, 40.5, 41.6, 43.3, 45.0, 46.1, 47.4, 48.3, 49.5, 50.2, 50.7, 51.1, 51.5,
      51.8, 52.1, 52.4, 52.7, 53.0, 53.3,
    ],
    F: [
      33.9, 36.5, 38.3, 39.5, 40.6, 42.2, 43.8, 44.9, 46.2, 47.2, 48.5, 49.3, 49.9, 50.3, 50.7,
      51.0, 51.3, 51.6, 51.9, 52.2, 52.5,
    ],
  },
};

/** Dispersão aproximada (log-normal) por medida */
const SPREAD: Record<GrowthMeasure, number> = {
  weight: 0.12,
  height: 0.04,
  head: 0.03,
  bmi: 0.085,
};

function interp(arr: number[], age: number): number {
  const a = Math.max(0, Math.min(age, AGES[AGES.length - 1]));
  for (let i = 0; i < AGES.length - 1; i++) {
    if (a <= AGES[i + 1]) {
      const t = (a - AGES[i]) / (AGES[i + 1] - AGES[i]);
      return arr[i] + t * (arr[i + 1] - arr[i]);
    }
  }
  return arr[arr.length - 1];
}

export function medianValue(sex: Sex, measure: GrowthMeasure, age: number): number {
  if (measure === "bmi") {
    const w = interp(MEDIANS.weight[sex], age);
    const h = interp(MEDIANS.height[sex], age) / 100;
    return w / (h * h);
  }
  return interp(MEDIANS[measure][sex], age);
}

export function referenceValue(sex: Sex, measure: GrowthMeasure, age: number, z: number): number {
  return medianValue(sex, measure, age) * Math.exp(z * SPREAD[measure]);
}

export function zScore(sex: Sex, measure: GrowthMeasure, age: number, value: number): number {
  return Math.log(value / medianValue(sex, measure, age)) / SPREAD[measure];
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
  weight: { label: "Peso x idade", short: "Peso", unit: "kg", maxAge: 156 },
  height: { label: "Comprimento/Estatura x idade", short: "Altura", unit: "cm", maxAge: 156 },
  head: { label: "Perímetro cefálico x idade", short: "PC", unit: "cm", maxAge: 60 },
  bmi: { label: "IMC x idade", short: "IMC", unit: "kg/m²", maxAge: 156 },
};
