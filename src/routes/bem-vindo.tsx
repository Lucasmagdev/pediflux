import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Link2, Stethoscope } from "lucide-react";
import { AppLoading, Logo } from "@/components/pediflux/Logo";
import { Field } from "@/components/pediflux/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, ensureClinic, loadClinic } from "@/data/store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/bem-vindo")({
  ssr: false,
  beforeLoad: async () => {
    const status = await ensureClinic();
    if (status === "anon") throw redirect({ to: "/" });
    if (status === "ready") throw redirect({ to: "/hoje" });
  },
  pendingComponent: AppLoading,
  head: () => ({ meta: [{ title: "Primeiro acesso · PediFlux" }] }),
  component: Onboarding,
});

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^(dra?\.?\s+)/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

function Onboarding() {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState("");
  const [clinic, setClinic] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const finalSlug = slugTouched ? slugify(slug) : slugify(doctor);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (finalSlug.length < 3) {
      toast.error("O endereço do link precisa ter pelo menos 3 letras");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("create_clinic", {
      p_name: clinic.trim(),
      p_slug: finalSlug,
      p_doctor_name: doctor.trim(),
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    await loadClinic();
    toast.success("Consultório criado! Bom trabalho 💙");
    navigate({ to: "/hoje" });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <form onSubmit={submit} className="card-surface grid gap-5 p-6 sm:p-8 animate-fade-up">
          <div>
            <h1 className="text-2xl font-extrabold">Vamos configurar seu consultório</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Leva 1 minuto. Você pode mudar tudo depois em Configurações.
            </p>
          </div>
          <Field label="Seu nome como aparece para as famílias *">
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 pl-9"
                placeholder="Dra. Marina Souza"
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                required
                minLength={2}
              />
            </div>
          </Field>
          <Field label="Nome do consultório *">
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 pl-9"
                placeholder="Consultório Pediátrico Crescer"
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
                required
                minLength={2}
              />
            </div>
          </Field>
          <Field label="Endereço do seu link de agendamento">
            <div className="flex overflow-hidden rounded-lg border border-input focus-within:ring-1 focus-within:ring-ring">
              <span className="flex items-center gap-1 bg-muted px-3 text-sm text-muted-foreground">
                <Link2 className="h-4 w-4" />
                <span className="hidden sm:inline">pediflux.com/agendar/</span>
              </span>
              <input
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                value={slugTouched ? slug : finalSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="dra-marina"
              />
            </div>
          </Field>
          <Button type="submit" variant="brand" size="lg" disabled={loading}>
            {loading ? "Criando…" : "Começar a usar"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Você ganha 7 dias com todos os recursos.{" "}
            <button
              type="button"
              className="font-semibold hover:underline"
              onClick={async () => {
                await actions.signOut();
                navigate({ to: "/" });
              }}
            >
              Sair
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
