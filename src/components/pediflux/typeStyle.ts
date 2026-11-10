import { Baby, RotateCcw, Syringe, Thermometer, type LucideIcon } from "lucide-react";
import type { AppointmentType } from "@/data/types";

/** Cor pastel e ícone por tipo de consulta (cartões da Hoje e blocos da Agenda). */
export const TYPE_STYLE: Record<
  AppointmentType,
  { bg: string; border: string; icon: LucideIcon; tint: string }
> = {
  Puericultura: { bg: "bg-peach", border: "border-l-orange", icon: Baby, tint: "text-orange" },
  "Doença aguda": {
    bg: "bg-rose",
    border: "border-l-destructive",
    icon: Thermometer,
    tint: "text-destructive",
  },
  Retorno: { bg: "bg-sky", border: "border-l-teal", icon: RotateCcw, tint: "text-teal" },
  Vacina: {
    bg: "bg-lavender",
    border: "border-l-[oklch(0.6_0.14_290)]",
    icon: Syringe,
    tint: "text-[oklch(0.55_0.15_290)]",
  },
};
