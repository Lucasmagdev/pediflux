import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck2, LineChart, Lock, Mail, ShieldCheck, Stethoscope } from "lucide-react";
import { Logo } from "@/components/pediflux/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/pediflux/ui";
import { supabase } from "@/integrations/supabase/client";

type Mode = "login" | "signup" | "forgot";

function authError(msg: string) {
  if (/Invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/Email not confirmed/i.test(msg))
    return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/already registered|already exists/i.test(msg))
    return "Este e-mail já tem conta. Use a opção Entrar.";
  if (/Password should be at least/i.test(msg))
    return "A senha precisa ter pelo menos 8 caracteres.";
  if (/rate limit/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  return msg;
}

/** Só aceita caminhos internos como destino pós-login. */
function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/hoje";
}

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s["next"] === "string" ? { next: s["next"] } : {},
  head: () => ({
    meta: [
      { title: "Entrar · PediFlux" },
      {
        name: "description",
        content: "Acesse o PediFlux: agenda, prontuário e curvas de crescimento para pediatras.",
      },
    ],
  }),
  component: LoginPage,
});

const HIGHLIGHTS = [
  {
    icon: CalendarCheck2,
    title: "Agenda do dia na palma da mão",
    text: "Status, encaixes e lembretes pelo WhatsApp em um clique.",
  },
  {
    icon: LineChart,
    title: "Curva de crescimento automática",
    text: "Percentil e escore Z calculados a cada consulta.",
  },
  {
    icon: Stethoscope,
    title: "Prontuário pensado para pediatria",
    text: "Modelos de puericultura prontos para usar.",
  },
];

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  // Já logado? Vai direto para o app.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace(safeNext(next));
    });
  }, [next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const origin = window.location.origin;
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.replace(safeNext(next));
        return;
      }
      if (mode === "signup") {
        if (password.length < 8) throw new Error("Password should be at least 8 characters");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${origin}/bem-vindo` },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/bem-vindo" });
          return;
        }
        setSent(
          `Enviamos um link de confirmação para ${email}. Abra o e-mail para ativar sua conta.`,
        );
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/nova-senha`,
      });
      if (error) throw error;
      setSent(`Se ${email} tiver conta, você vai receber um link para criar uma nova senha.`);
    } catch (err) {
      toast.error(authError((err as Error).message));
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Mode, [string, string, string]> = {
    login: ["Bem-vinda de volta", "Entre para ver a agenda de hoje.", "Entrar"],
    signup: ["Crie sua conta", "Teste 7 dias com todos os recursos liberados.", "Criar conta"],
    forgot: ["Esqueceu a senha?", "Enviamos um link para você criar uma nova.", "Enviar link"],
  };
  const [title, subtitle, cta] = titles[mode];

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1.1fr_1fr]">
      {/* Lado da marca */}
      <aside className="relative hidden overflow-hidden bg-gradient-hero p-12 text-navy-foreground lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-teal/30 blur-3xl" />
        <div className="relative mt-auto max-w-lg">
          <h1 className="text-4xl font-extrabold leading-tight !text-white">
            Gestão Inteligente para sua Clínica Pediátrica
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Menos papel, mais tempo com as crianças. Tudo o que o pediatra precisa, sem complicação.
          </p>
          <ul className="mt-10 grid gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="block text-sm text-white/75">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-10 text-sm text-white/60">
          © {new Date().getFullYear()} PediFlux
        </p>
      </aside>

      {/* Formulário */}
      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-8">
          <Logo size="xl" tagline className="max-w-full lg:hidden" />
          <Logo size="lg" className="hidden lg:inline-flex" />
        </div>
        <div className="card-surface w-full max-w-md p-6 sm:p-8 animate-fade-up">
          <h2 className="text-2xl font-extrabold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          {sent ? (
            <div className="mt-6 grid gap-4">
              <p className="rounded-xl bg-accent p-4 text-sm text-navy">{sent}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSent(null);
                  setMode("login");
                }}
              >
                Voltar para o login
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 grid gap-4">
              <Field label="E-mail">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    autoComplete="email"
                    className="h-11 pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </Field>
              {mode !== "forgot" && (
                <Field label={mode === "signup" ? "Crie uma senha (mín. 8 caracteres)" : "Senha"}>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      minLength={mode === "signup" ? 8 : undefined}
                      className="h-11 pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </Field>
              )}
              {mode === "login" && (
                <div className="flex justify-end text-sm">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="font-semibold text-teal hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}
              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="mt-2 w-full"
                disabled={loading}
              >
                {loading ? "Aguarde…" : cta}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {mode === "login" ? (
                  <>
                    Ainda não tem conta?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="font-semibold text-teal hover:underline"
                    >
                      Teste grátis por 7 dias
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="font-semibold text-teal hover:underline"
                  >
                    Já tenho conta — entrar
                  </button>
                )}
              </p>
            </form>
          )}
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" /> Dados criptografados e isolados por
            clínica
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <a href="/planos" className="hover:text-navy hover:underline">
            Planos e preços
          </a>
        </p>
      </main>
    </div>
  );
}
