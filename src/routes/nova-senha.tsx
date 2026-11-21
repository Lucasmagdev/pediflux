import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Logo } from "@/components/pediflux/Logo";
import { Field } from "@/components/pediflux/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

// Destino do link "Esqueci minha senha": o Supabase abre uma sessão de recuperação pela URL.
export const Route = createFileRoute("/nova-senha")({
  ssr: false,
  head: () => ({ meta: [{ title: "Nova senha · PediFlux" }] }),
  component: NewPassword,
});

function NewPassword() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: d }) => setReady(!!d.session));
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada!");
    window.location.replace("/hoje");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="card-surface p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold">Criar nova senha</h1>
          {ready === false ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Este link expirou ou já foi usado.{" "}
              <a href="/" className="font-semibold text-teal hover:underline">
                Peça um novo na tela de login
              </a>
              .
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 grid gap-4">
              <Field label="Nova senha (mín. 8 caracteres)">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    autoComplete="new-password"
                    className="h-11 pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
              </Field>
              <Button type="submit" variant="brand" size="lg" disabled={loading || !ready}>
                {loading ? "Salvando…" : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
