import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Baby, Droplets, Ruler, Scale, Thermometer, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "./ui";
import { MEASURE_META, type GrowthMeasure } from "@/data/growth-reference";
import type { Consultation, Patient } from "@/data/types";
import { formatDate } from "@/lib/age";
import { fmt, formatPercentile, growthAlert, isPremature, patientPoints } from "@/lib/growth";
import { cn } from "@/lib/utils";

/* ---------------- Diagnóstico de crescimento (silhueta + cartões) ---------------- */
const ROWS: { measure: GrowthMeasure; icon: LucideIcon; tile: string; dotX: number }[] = [
  { measure: "head", icon: Baby, tile: "bg-lavender text-[oklch(0.55_0.15_290)]", dotX: 78 },
  { measure: "weight", icon: Scale, tile: "bg-peach text-orange", dotX: 78 },
  { measure: "bmi", icon: Activity, tile: "bg-sky text-info", dotX: 78 },
  { measure: "height", icon: Ruler, tile: "bg-teal/12 text-teal", dotX: 63 },
];

const ROW_H = 72;
const GAP = 12;
const COL_W = 156;
const END_X = COL_W + 16;
const H = ROWS.length * ROW_H + (ROWS.length - 1) * GAP;
const centerY = (i: number) => ROW_H / 2 + i * (ROW_H + GAP);

function ChildSilhouette() {
  return (
    <svg
      className="absolute inset-0 overflow-visible"
      width={COL_W}
      height={H}
      viewBox={`0 0 ${COL_W} ${H}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pf-child" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.8 0.11 190)" />
          <stop offset="100%" stopColor="oklch(0.6 0.12 205)" />
        </linearGradient>
      </defs>
      <g fill="url(#pf-child)">
        <circle cx="78" cy="38" r="27" />
        <path d="M60 18 Q70 4 86 10 Q98 14 100 26 Q90 16 76 20 Q66 22 60 18 Z" opacity="0.9" />
        <rect x="71" y="62" width="14" height="14" rx="5" />
        <path d="M50 84 Q50 74 60 74 H96 Q106 74 106 84 L108 194 Q108 206 96 206 H60 Q48 206 48 194 Z" />
        <rect x="28" y="80" width="18" height="104" rx="9" transform="rotate(9 37 82)" />
        <rect x="110" y="80" width="18" height="104" rx="9" transform="rotate(-9 119 82)" />
        <rect x="52" y="196" width="23" height={H - 196} rx="11.5" />
        <rect x="81" y="196" width="23" height={H - 196} rx="11.5" />
      </g>
      {ROWS.map((r, i) => {
        const y = centerY(i);
        return (
          <g key={r.measure}>
            <line
              x1={r.dotX}
              y1={y}
              x2={END_X}
              y2={y}
              stroke="var(--orange)"
              strokeOpacity="0.6"
              strokeWidth="1.5"
            />
            <circle
              cx={r.dotX}
              cy={y}
              r="5"
              fill="var(--card)"
              stroke="var(--orange)"
              strokeWidth="2.5"
            />
          </g>
        );
      })}
    </svg>
  );
}

export function GrowthDiagnosis({ patient, onOpen }: { patient: Patient; onOpen: () => void }) {
  const lastDate = patient.measurements[patient.measurements.length - 1]?.date;
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Diagnóstico de crescimento</h2>
          <p className="text-sm text-muted-foreground">
            {lastDate ? `Última medição em ${formatDate(lastDate)}` : "Sem medições ainda"}
            {isPremature(patient) && " · idade corrigida"}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-teal/50 hover:text-teal"
        >
          Ver curvas
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[156px_1fr]">
        <div className="relative hidden sm:block" style={{ height: H }}>
          <ChildSilhouette />
        </div>
        <ul className="grid grid-cols-1 gap-3">
          {ROWS.map((r) => {
            const pts = patientPoints(patient, r.measure);
            const last = pts[pts.length - 1];
            const alert = growthAlert(patient, r.measure);
            const meta = MEASURE_META[r.measure];
            const tone = !last
              ? "bg-muted-foreground/30"
              : last.percentile < 3 || last.percentile > 97
                ? "bg-destructive"
                : alert || last.percentile < 15 || last.percentile > 85
                  ? "bg-orange"
                  : "bg-teal";
            return (
              <li key={r.measure}>
                <button
                  type="button"
                  onClick={onOpen}
                  className="flex h-[72px] w-full items-center gap-3 rounded-2xl border border-border bg-card px-3.5 text-left transition hover:border-teal/40 hover:shadow-soft"
                >
                  <span
                    className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", r.tile)}
                  >
                    <r.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-bold text-navy">
                        {r.measure === "head" ? "Perímetro cefálico" : meta.short}
                      </span>
                      <span className="shrink-0 text-sm font-extrabold text-navy">
                        {last
                          ? fmt(last.value, r.measure === "weight" && last.value < 20 ? 2 : 1)
                          : "—"}
                        <span className="ml-0.5 text-[11px] font-semibold text-muted-foreground">
                          {meta.unit}
                        </span>
                      </span>
                    </span>
                    <span className="mt-2 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className={cn("block h-full rounded-full", tone)}
                          style={{ width: `${last ? Math.max(4, last.percentile) : 0}%` }}
                        />
                      </span>
                      <span className="w-9 text-right text-[11px] font-bold text-muted-foreground">
                        {last ? formatPercentile(last.percentile) : ""}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

/* ---------------- Sinais vitais ---------------- */
function latestVitals(consultations: Consultation[]) {
  return [...consultations]
    .sort((a, b) => b.date.localeCompare(a.date))
    .find((c) => c.vitals && Object.values(c.vitals).some((v) => v != null));
}

export function VitalsCard({ consultations }: { consultations: Consultation[] }) {
  const last = latestVitals(consultations);
  const v = last?.vitals;
  const tiles = [
    {
      label: "Temperatura",
      value: v?.temp != null ? fmt(v.temp, 1) : "—",
      unit: "°C",
      icon: Thermometer,
      cls: "bg-peach",
      tint: "text-orange",
      warn: (v?.temp ?? 0) >= 37.8,
    },
    {
      label: "Saturação",
      value: v?.spo2 != null ? String(v.spo2) : "—",
      unit: "%",
      icon: Droplets,
      cls: "bg-sky",
      tint: "text-info",
      warn: (v?.spo2 ?? 100) < 95,
    },
    {
      label: "Freq. resp.",
      value: v?.rr != null ? String(v.rr) : "—",
      unit: "irpm",
      icon: Wind,
      cls: "bg-lavender",
      tint: "text-[oklch(0.55_0.15_290)]",
      warn: false,
    },
  ];

  return (
    <div className="grid content-start gap-4">
      <div className="relative overflow-hidden rounded-[1.25rem] bg-gradient-teal p-5 text-white shadow-lift">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold !text-white">Frequência cardíaca</h2>
            <p className="text-sm text-white/80">
              {last ? `Aferida em ${formatDate(last.date)}` : "Ainda não aferida"}
            </p>
          </div>
        </div>
        <svg
          viewBox="0 0 300 100"
          preserveAspectRatio="none"
          className="relative mt-2 h-20 w-full"
          aria-hidden="true"
        >
          <path
            d="M0 58 H52 L60 58 L68 26 L78 88 L88 44 L95 58 H150 L158 58 L166 22 L176 92 L186 46 L193 58 H300"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <p className="relative text-5xl font-extrabold tracking-tight">
          {v?.hr ?? "—"}
          <span className="ml-2 text-2xl font-semibold text-white/80">bpm</span>
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={cn("rounded-2xl p-3", t.cls)}>
            <t.icon className={cn("h-4 w-4", t.warn ? "text-destructive" : t.tint)} />
            <p
              className={cn(
                "mt-2 text-xl font-extrabold",
                t.warn ? "text-destructive" : "text-navy",
              )}
            >
              {t.value}
              <span className="ml-0.5 text-[11px] font-semibold text-muted-foreground">
                {t.unit}
              </span>
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VitalsHistory({ consultations }: { consultations: Consultation[] }) {
  const data = [...consultations]
    .filter((c) => c.vitals?.hr != null || c.vitals?.temp != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => ({
      label: formatDate(c.date).slice(0, 5),
      hr: c.vitals?.hr,
      temp: c.vitals?.temp,
    }));

  return (
    <div className="rounded-[1.25rem] border border-orange/10 bg-peach/70 p-5">
      <h2 className="text-base font-bold">Histórico de FC</h2>
      <p className="text-sm text-muted-foreground">Batimentos por consulta</p>
      {data.length >= 2 ? (
        <div className="mt-3 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="pf-hr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--orange)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--orange)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                interval={0}
                padding={{ left: 10, right: 10 }}
                stroke="var(--muted-foreground)"
              />
              <YAxis hide domain={["dataMin - 12", "dataMax + 8"]} />
              <Tooltip
                cursor={{ stroke: "var(--orange)", strokeOpacity: 0.3 }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as (typeof data)[number] | undefined;
                  return active && row ? (
                    <div className="rounded-xl bg-card px-3 py-1.5 text-xs shadow-lift">
                      <b className="text-navy">{row.hr} bpm</b>
                      {row.temp != null && (
                        <span className="ml-2 text-muted-foreground">{fmt(row.temp, 1)} °C</span>
                      )}
                    </div>
                  ) : null;
                }}
              />
              <Area
                type="monotone"
                dataKey="hr"
                stroke="var(--orange)"
                strokeWidth={2.5}
                fill="url(#pf-hr)"
                dot={{ r: 3.5, fill: "var(--card)", stroke: "var(--orange)", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "var(--orange)", stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Registre os sinais vitais nas consultas para ver a evolução.
        </p>
      )}
    </div>
  );
}
