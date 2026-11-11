import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Mail } from "lucide-react";
import { Logo } from "@/components/pediflux/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/obrigado")({
  head: () => ({ meta: [{ title: "Assinatura recebida · PediFlux" }] }),
  component: ThanksPage,
});

function ThanksPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="card-surface w-full max-w-md p-8 text-center animate-fade-up">
        <Logo size="lg" className="mb-6" />
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/12 text-success">
          <CheckCircle2 className="h-9 w-9" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">Assinatura recebida!</h1>
        <p className="mt-2 text-muted-foreground">
          Assim que o pagamento for confirmado, liberamos seu plano. Crie sua conta com o{" "}
          <b className="text-navy">mesmo e-mail da compra</b> e ele já entra ativo.
        </p>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" /> Também enviamos um convite para o seu e-mail.
        </p>
        <Button variant="brand" size="lg" className="mt-6 w-full" asChild>
          <a href="/">Acessar o PediFlux</a>
        </Button>
      </div>
    </div>
  );
}
