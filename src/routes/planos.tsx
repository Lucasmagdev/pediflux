import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/pediflux/Logo";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos e preços · PediFlux" },
      {
        name: "description",
        content: "Agenda, prontuário e curvas de crescimento para pediatras. Escolha seu plano.",
      },
    ],
  }),
  component: PlansPage,
});

type Interval = "month" | "year";
type Tier = "essencial" | "plus" | "pro";

interface PlanRow {
  tier: Tier;
  billing_interval: Interval;
  amount: number;
  checkout_url: string | null;
}

const TIERS: {
  tier: Tier;
  name: string;
  tagline: string;
  highlight?: boolean;
  features: string[];
}[] = [
  {
    tier: "essencial",
    name: "Essencial",
    tagline: "Para começar a organizar o consultório",
    features: [
      "Agenda e link de agendamento",
      "Prontuário com modelos de puericultura",
      "Curvas de crescimento automáticas",
      "Sinais vitais e exames",
      "5 GB de armazenamento",
    ],
  },
  {
    tier: "plus",
    name: "Plus",
    tagline: "Fidelize as famílias com o portal da mãe",
    highlight: true,
    features: [
      "Tudo do Essencial",
      "Portal da família (consultas, curva e exames)",
      "Relatórios básicos",
      "20 GB de armazenamento",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    tagline: "Para quem quer o máximo",
    features: [
      "Tudo do Plus",
      "Modelos de prontuário próprios",
      "100 GB de armazenamento",
      "Prioridade no suporte",
    ],
  },
];

// Valores de referência (usados até o banco responder; o checkout só abre com o link do banco).
const FALLBACK: Record<Tier, Record<Interval, number>> = {
  essencial: { month: 79, year: 790 },
  plus: { month: 149, year: 1490 },
  pro: { month: 279, year: 2790 },
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

function PlansPage() {
  const [interval, setInterval] = useState<Interval>("month");
  const [rows, setRows] = useState<PlanRow[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from("billing_plans")
      .select("tier, billing_interval, amount, checkout_url")
      .then(({ data }) => {
        if (data) setRows(data as unknown as PlanRow[]);
      });
  }, []);

  const get = (tier: Tier) => rows.find((r) => r.tier === tier && r.billing_interval === interval);

  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo size="md" />
        <a href="/" className="text-sm font-semibold text-muted-foreground hover:text-navy">
          Já sou cliente
        </a>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-extrabold sm:text-5xl">Um plano para cada consultório</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Teste 7 dias com tudo liberado. Cancele quando quiser, seus dados continuam seus.
          </p>
          <div className="mt-8 inline-flex rounded-full bg-card p-1 shadow-soft">
            {(["month", "year"] as const).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInterval(i)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-semibold transition",
                  interval === i ? "bg-teal text-white" : "text-muted-foreground",
                )}
              >
                {i === "month" ? "Mensal" : "Anual"}
                {i === "year" && (
                  <span
                    className={cn(
                      "ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold",
                      interval === "year" ? "bg-white text-teal" : "bg-orange/15 text-orange",
                    )}
                  >
                    2 meses grátis
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {TIERS.map((t) => {
            const row = get(t.tier);
            const price = row?.amount ?? FALLBACK[t.tier][interval];
            const monthly = interval === "year" ? price / 12 : price;
            return (
              <section
                key={t.tier}
                className={cn(
                  "relative flex flex-col rounded-[1.75rem] bg-card p-7 shadow-soft",
                  t.highlight && "ring-2 ring-teal shadow-lift lg:-my-3",
                )}
              >
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-brand px-4 py-1 text-xs font-bold text-white">
                    Mais escolhido
                  </span>
                )}
                <h2 className="text-xl font-extrabold">{t.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>
                <p className="mt-6 text-5xl font-extrabold tracking-tight text-navy">
                  {brl(Math.round(monthly))}
                  <span className="ml-1 text-base font-semibold text-muted-foreground">/mês</span>
                </p>
                <p className="mt-1 h-5 text-xs text-muted-foreground">
                  {interval === "year" ? `${brl(price)} cobrados uma vez por ano` : ""}
                </p>
                <ul className="mt-6 grid flex-1 grid-cols-1 gap-3 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-navy">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  variant={t.highlight ? "brand" : "outline"}
                  className="mt-8 w-full"
                  disabled={!row?.checkout_url}
                  asChild={!!row?.checkout_url}
                >
                  {row?.checkout_url ? (
                    <a href={row.checkout_url} rel="noreferrer">
                      Assinar {t.name}
                    </a>
                  ) : (
                    <span>Em breve</span>
                  )}
                </Button>
              </section>
            );
          })}
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" /> Pagamento seguro pelo Mercado Pago.
          Cancele a qualquer momento.
        </p>
      </main>
    </div>
  );
}
