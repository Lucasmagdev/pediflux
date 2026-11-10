import { ageInMonths } from "@/lib/age";
import {
  lineIndex,
  nearestLine,
  percentileFromZ,
  zScore,
  PERCENTILE_LINES,
  type GrowthMeasure,
} from "@/data/growth-reference";
import type { Measurement, Patient } from "@/data/types";

export function bmiOf(m: Pick<Measurement, "weight" | "height">): number | undefined {
  if (!m.weight || !m.height) return undefined;
  const h = m.height / 100;
  return m.weight / (h * h);
}

export function valueOf(m: Measurement, measure: GrowthMeasure): number | undefined {
  if (measure === "bmi") return bmiOf(m);
  return m[measure];
}

export function isPremature(p: Patient): boolean {
  return !!p.gestationalWeeks && p.gestationalWeeks < 37;
}

/** Idade em meses, corrigida pela prematuridade quando solicitado (até 24 meses). */
export function measurementAge(p: Patient, date: string, corrected: boolean): number {
  const raw = ageInMonths(p.birthDate, date);
  if (!corrected || !isPremature(p)) return raw;
  const corr = raw - ((40 - (p.gestationalWeeks ?? 40)) * 7) / 30.4375;
  return raw <= 24 ? Math.max(0, corr) : raw;
}

export interface GrowthPoint {
  id: string;
  date: string;
  age: number;
  value: number;
  z: number;
  percentile: number;
}

export function patientPoints(p: Patient, measure: GrowthMeasure, corrected = false): GrowthPoint[] {
  return [...p.measurements]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((m) => {
      const v = valueOf(m, measure);
      if (v == null) return [];
      const age = measurementAge(p, m.date, corrected);
      const z = zScore(p.sex, measure, age, v);
      return [{ id: m.id, date: m.date, age, value: v, z, percentile: percentileFromZ(z) }];
    });
}

export interface GrowthAlert {
  level: "warning" | "danger";
  text: string;
}

export function growthAlert(p: Patient, measure: GrowthMeasure, corrected = false): GrowthAlert | null {
  const pts = patientPoints(p, measure, corrected);
  if (!pts.length) return null;
  const last = pts[pts.length - 1];
  if (last.z < PERCENTILE_LINES[0].z || last.z > PERCENTILE_LINES[4].z) {
    return {
      level: "danger",
      text: last.z < 0 ? `Abaixo do P3 na última medição` : `Acima do P97 na última medição`,
    };
  }
  if (pts.length >= 2) {
    const prev = pts[pts.length - 2];
    if (lineIndex(last.z) < lineIndex(prev.z) && prev.z - last.z > 0.6) {
      return {
        level: "warning",
        text: `Caiu de ${nearestLine(prev.z)} para ${nearestLine(last.z)} desde a última consulta`,
      };
    }
  }
  return null;
}

export function formatPercentile(p: number): string {
  if (p < 1) return "<P1";
  if (p > 99) return ">P99";
  return `P${Math.round(p)}`;
}

export function fmt(n: number | undefined, digits = 1): string {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
