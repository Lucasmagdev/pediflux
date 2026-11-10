import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, MessageCircle, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "./ui";
import { Logo } from "./Logo";
import { GrowthChart, GrowthLegend } from "./GrowthChart";
import { AddMeasurementDialog } from "./dialogs";
import { MEASURE_META, type GrowthMeasure } from "@/data/growth-reference";
import { useStore } from "@/data/store";
import type { Patient } from "@/data/types";
import { firstName, formatAge, formatDate, whatsappLink } from "@/lib/age";
import { fmt, formatPercentile, growthAlert, isPremature, patientPoints } from "@/lib/growth";
import { cn } from "@/lib/utils";

const MEASURES: GrowthMeasure[] = ["weight", "height", "head", "bmi"];

export function GrowthPanel({ patient }: { patient: Patient }) {
  const settings = useStore((s) => s.settings);
  const [measure, setMeasure] = useState<GrowthMeasure>("weight");
  const [corrected, setCorrected] = useState(isPremature(patient));
  const [addOpen, setAddOpen] = useState(false);
  const meta = MEASURE_META[measure];
  const points = useMemo(
    () => patientPoints(patient, measure, corrected),
    [patient, measure, corrected],
  );
  const alert = growthAlert(patient, measure, corrected);
  const last = points[points.length - 1];
  const digits = (v: number) => (measure === "weight" && v < 20 ? 2 : 1);

  const shareText = useMemo(() => {
    const lines = [
      `Olá, ${firstName(patient.guardianName)}! Segue o resumo do crescimento do(a) ${firstName(patient.name)}:`,
    ];
    for (const m of ["weight", "height", "head"] as GrowthMeasure[]) {
      const pts = patientPoints(patient, m, corrected);
      const l = pts[pts.length - 1];
      if (l)
        lines.push(
          `• ${MEASURE_META[m].short}: ${fmt(l.value, m === "weight" && l.value < 20 ? 2 : 1)} ${MEASURE_META[m].unit} (${formatPercentile(l.percentile)})`,
        );
    }
    lines.push(`\n${settings.doctorName} · ${settings.clinicName}`);
    return lines.join("\n");
  }, [patient, corrected, settings]);

  return (
    <div className="grid gap-4">
      <div className="no-print flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap rounded-xl bg-muted p-1">
          {MEASURES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMeasure(m)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition sm:px-4",
                measure === m
                  ? "bg-card text-navy shadow-soft"
                  : "text-muted-foreground hover:text-navy",
              )}
            >
              {MEASURE_META[m].label.split(" x ")[0]}
            </button>
          ))}
        </div>
        {isPremature(patient) && (
          <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-navy">
            <Switch checked={corrected} onCheckedChange={setCorrected} />
            Corrigir pela prematuridade ({patient.gestationalWeeks} sem.)
          </label>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Imprimir
          </Button>
          <Button variant="outline" className="text-success" asChild>
            <a href={whatsappLink(patient.phone, shareText)} target="_blank" rel="noreferrer">
              <MessageCircle /> Enviar para a mãe
            </a>
          </Button>
          <Button variant="brand" onClick={() => setAddOpen(true)}>
            <Plus /> Adicionar medição
          </Button>
        </div>
      </div>

      {alert ? (
        <div
          className={cn(
            "no-print flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold",
            alert.level === "danger"
              ? "border-destructive/30 bg-destructive/8 text-destructive"
              : "border-warning/40 bg-warning/12 text-[oklch(0.5_0.13_65)]",
          )}
        >
          <AlertTriangle className="h-5 w-5 shrink-0" /> {alert.text}
        </div>
      ) : last ? (
        <div className="no-print flex items-center gap-3 rounded-2xl border border-success/30 bg-success/8 px-4 py-3 text-sm font-semibold text-success">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> Crescimento dentro do canal esperado (
          {formatPercentile(last.percentile)})
        </div>
      ) : null}

      <Card className="print-area p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold">{meta.label}</h3>
            <p className="text-sm text-muted-foreground">
              {patient.name} · {patient.sex === "F" ? "Menina" : "Menino"} ·{" "}
              {formatAge(patient.birthDate)}
              {corrected && isPremature(patient) && " · idade corrigida"}
            </p>
          </div>
          {last && (
            <div className="rounded-2xl bg-accent px-4 py-2 text-right">
              <p className="text-2xl font-extrabold text-navy">
                {fmt(last.value, digits(last.value))}{" "}
                <span className="text-sm font-semibold text-muted-foreground">{meta.unit}</span>
              </p>
              <p className="text-xs font-semibold text-teal">
                {formatPercentile(last.percentile)} · Z {last.z >= 0 ? "+" : ""}
                {fmt(last.z, 2)}
              </p>
            </div>
          )}
          <Logo size="sm" className="hidden print:inline-flex" />
        </div>
        {points.length ? (
          <GrowthChart patient={patient} measure={measure} corrected={corrected} />
        ) : (
          <div className="grid h-60 place-items-center text-sm text-muted-foreground">
            Nenhuma medida de {meta.short.toLowerCase()} registrada.
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <GrowthLegend />
          <p className="text-[11px] text-muted-foreground">
            Referência OMS (valores aproximados de demonstração)
          </p>
        </div>
        <p className="mt-4 hidden text-xs text-muted-foreground print:block">
          {settings.doctorName} · {settings.crm} · {settings.clinicName} · {settings.phone}
        </p>
      </Card>

      <Card className="no-print overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-bold">Histórico de medições</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-semibold">Data</th>
                <th className="px-3 py-3 font-semibold">Idade</th>
                <th className="px-3 py-3 font-semibold">Peso</th>
                <th className="px-3 py-3 font-semibold">Altura</th>
                <th className="px-3 py-3 font-semibold">PC</th>
                <th className="px-3 py-3 font-semibold">IMC</th>
                <th className="px-5 py-3 font-semibold">{meta.short}: percentil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...patient.measurements].reverse().map((m) => {
                const pt = points.find((p) => p.id === m.id);
                const bmi = m.weight && m.height ? m.weight / (m.height / 100) ** 2 : undefined;
                return (
                  <tr key={m.id} className="hover:bg-muted/40">
                    <td className="px-5 py-2.5 font-medium text-navy">{formatDate(m.date)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatAge(patient.birthDate, m.date)}
                    </td>
                    <td className="px-3 py-2.5">
                      {m.weight ? `${fmt(m.weight, m.weight < 20 ? 3 : 1)} kg` : "—"}
                    </td>
                    <td className="px-3 py-2.5">{m.height ? `${fmt(m.height)} cm` : "—"}</td>
                    <td className="px-3 py-2.5">{m.head ? `${fmt(m.head)} cm` : "—"}</td>
                    <td className="px-3 py-2.5">{bmi ? fmt(bmi) : "—"}</td>
                    <td className="px-5 py-2.5">
                      {pt ? (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                            pt.percentile < 3 || pt.percentile > 97
                              ? "bg-destructive/10 text-destructive"
                              : pt.percentile < 15 || pt.percentile > 85
                                ? "bg-warning/15 text-[oklch(0.5_0.13_65)]"
                                : "bg-success/12 text-success",
                          )}
                        >
                          {formatPercentile(pt.percentile)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <AddMeasurementDialog patient={patient} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
