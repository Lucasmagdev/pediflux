import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MEASURE_META,
  PERCENTILE_LINES,
  referenceValue,
  type GrowthMeasure,
} from "@/data/growth-reference";
import type { Patient } from "@/data/types";
import { formatAgeMonths, formatDate } from "@/lib/age";
import { fmt, formatPercentile, patientPoints, type GrowthPoint } from "@/lib/growth";

interface Row {
  age: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
  value?: number;
  point?: GrowthPoint;
}

/** Janela do eixo X conforme a idade da criança. */
export function chartWindow(ageMonths: number, measure: GrowthMeasure): number {
  const max = MEASURE_META[measure].maxAge;
  if (ageMonths <= 5) return 6;
  if (ageMonths <= 10) return 12;
  if (ageMonths <= 22) return 24;
  if (ageMonths <= 58) return Math.min(60, max);
  return max;
}

export function GrowthChart({
  patient,
  measure,
  corrected,
  simple = false,
  height = 380,
}: {
  patient: Patient;
  measure: GrowthMeasure;
  corrected?: boolean;
  simple?: boolean;
  height?: number;
}) {
  const points = useMemo(
    () => patientPoints(patient, measure, corrected),
    [patient, measure, corrected],
  );
  const lastAge = points.length ? points[points.length - 1]!.age : 0;
  const win = chartWindow(lastAge, measure);
  const meta = MEASURE_META[measure];

  const rows = useMemo<Row[]>(() => {
    const step = win <= 12 ? 0.25 : win <= 24 ? 0.5 : win <= 60 ? 1 : 3;
    const ref = (age: number): Row => {
      const r = { age } as Row;
      for (const l of PERCENTILE_LINES) r[l.key] = referenceValue(patient.sex, measure, age, l.z);
      return r;
    };
    const base: Row[] = [];
    for (let a = 0; a <= win + 1e-9; a += step) base.push(ref(Math.round(a * 100) / 100));
    const pts = points
      .filter((p) => p.age <= win + 0.5)
      .map((p) => ({ ...ref(p.age), value: p.value, point: p }));
    return [...base, ...pts].sort((a, b) => a.age - b.age);
  }, [patient.sex, measure, win, points]);

  const yDomain = useMemo(() => {
    const vals = rows.flatMap((r) => [r.p3, r.p97, r.value ?? r.p50]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.04;
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
  }, [rows]);

  const ticks = useMemo(() => {
    const every = win <= 6 ? 1 : win <= 12 ? 2 : win <= 24 ? 3 : 12;
    return Array.from({ length: Math.floor(win / every) + 1 }, (_, i) => i * every);
  }, [win]);

  const lastIndex = rows.length - 1;
  const lineLabel = (label: string) =>
    function EndLabel(props: { x?: number | string; y?: number | string; index?: number }) {
      if (props.index !== lastIndex || simple) return null;
      return (
        <text
          x={Number(props.x) + 6}
          y={Number(props.y) + 4}
          fontSize={11}
          fontWeight={700}
          fill="var(--muted-foreground)"
        >
          {label}
        </text>
      );
    };

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 12, right: simple ? 12 : 40, bottom: 8, left: 0 }}
        >
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="age"
            type="number"
            domain={[0, win]}
            ticks={ticks}
            tickFormatter={(v: number) => (win <= 24 ? `${v}m` : `${v / 12}a`)}
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            domain={yDomain}
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => fmt(v, 0)}
          />
          <Area
            dataKey={(r: Row) => [r.p3, r.p97]}
            stroke="none"
            fill="var(--band-outer)"
            isAnimationActive={false}
            activeDot={false}
          />
          <Area
            dataKey={(r: Row) => [r.p15, r.p85]}
            stroke="none"
            fill="var(--band-inner)"
            isAnimationActive={false}
            activeDot={false}
          />
          {PERCENTILE_LINES.filter((l) => !simple || l.key === "p50").map((l) => (
            <Line
              key={l.key}
              dataKey={l.key}
              stroke="var(--band-line)"
              strokeWidth={l.key === "p50" ? 1.6 : 1}
              strokeDasharray={l.key === "p50" ? undefined : "4 4"}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            >
              <LabelList dataKey={l.key} content={lineLabel(l.label)} />
            </Line>
          ))}
          <Line
            dataKey="value"
            connectNulls
            stroke="var(--teal)"
            strokeWidth={3}
            dot={{
              r: simple ? 5 : 4.5,
              fill: "var(--card)",
              stroke: "var(--teal)",
              strokeWidth: 2.5,
            }}
            activeDot={{ r: 7, fill: "var(--teal)", stroke: "var(--card)", strokeWidth: 3 }}
            isAnimationActive={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--teal)", strokeOpacity: 0.3 }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as Row | undefined;
              if (!active || !row?.point) return null;
              const p = row.point;
              return (
                <div className="rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-lift">
                  <p className="font-bold text-navy">
                    {fmt(p.value, measure === "weight" && p.value < 20 ? 2 : 1)} {meta.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.date)} · {formatAgeMonths(p.age)}
                  </p>
                  {!simple && (
                    <p className="mt-1 text-xs font-semibold text-teal">
                      {formatPercentile(p.percentile)} · escore Z {p.z >= 0 ? "+" : ""}
                      {fmt(p.z, 2)}
                    </p>
                  )}
                </div>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GrowthLegend({ simple = false }: { simple?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full border-[2.5px] border-teal bg-card" />{" "}
        {simple ? "Medidas da criança" : "Paciente"}
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-6 rounded bg-[var(--band-inner)]" />{" "}
        {simple ? "Faixa mais comum" : "P15 – P85"}
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-6 rounded bg-[var(--band-outer)]" />{" "}
        {simple ? "Faixa esperada" : "P3 – P97"}
      </span>
      <span className="flex items-center gap-2">
        <span className="h-0.5 w-6 bg-[var(--band-line)]" /> {simple ? "Média" : "P50 (mediana)"}
      </span>
    </div>
  );
}
