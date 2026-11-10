import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarCheck2, LineChart, Lock, Mail, ShieldCheck, Stethoscope } from "lucide-react";
import { Logo } from "@/components/pediflux/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/pediflux/ui";

export const Route = createFileRoute("/")({
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
  const [email, setEmail] = useState("marina@pediflux.app");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => navigate({ to: "/hoje" }), 450);
  }

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1.1fr_1fr]">
      {/* Lado da marca */}
      <aside className="relative hidden overflow-hidden bg-gradient-hero p-12 text-navy-foreground lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-teal/30 blur-3xl" />
        <Logo size="md" onDark className="relative self-start" />
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
        <div className="mb-8 lg:hidden">
          <Logo size="xl" tagline className="max-w-full" />
        </div>
        <div className="card-surface w-full max-w-md p-6 sm:p-8 animate-fade-up">
          <h2 className="text-2xl font-extrabold">Bem-vinda de volta</h2>
          <p className="mt-1 text-sm text-muted-foreground">Entre para ver a agenda de hoje.</p>
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <Field label="E-mail">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  className="h-11 pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </Field>
            <Field label="Senha">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  className="h-11 pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </Field>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--teal)]" />{" "}
                Manter conectado
              </label>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="font-semibold text-teal hover:underline"
              >
                Esqueci minha senha
              </a>
            </div>
            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="mt-2 w-full"
              disabled={loading}
            >
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" /> Dados protegidos e armazenados no
            Brasil
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ambiente de demonstração — qualquer e-mail e senha funcionam.
        </p>
      </main>
    </div>
  );
}
