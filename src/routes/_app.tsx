import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Users,
} from "lucide-react";
import { AppLoading, Logo, LogoMark } from "@/components/pediflux/Logo";
import { Avatar } from "@/components/pediflux/ui";
import { NewAppointmentDialog } from "@/components/pediflux/dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { actions, useStore } from "@/data/store";
import { formatAge, formatDate } from "@/lib/age";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  // Dados de demonstração vivem no navegador (data/fuso do usuário): renderiza só no cliente.
  ssr: false,
  pendingComponent: AppLoading,
  component: AppLayout,
});

const NAV = [
  { to: "/hoje", label: "Hoje", icon: Home },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/configuracoes", label: "Configurações", icon: SettingsIcon },
] as const;

function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-surface lg:bg-frame lg:p-5">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 border-0 bg-cream p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Moldura do app (desktop): cartão branco arredondado sobre fundo teal suave */}
      <div className="mx-auto flex min-h-screen max-w-[1480px] lg:min-h-[calc(100vh-2.5rem)] lg:overflow-clip lg:rounded-[2rem] lg:bg-card lg:shadow-[0_30px_80px_-30px_oklch(0.31_0.09_258/0.35)]">
        <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-60 shrink-0 border-r border-border/70 bg-cream lg:block">
          <SidebarContent />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col bg-surface">
          <Topbar onMenu={() => setMenuOpen(true)} />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-2 sm:px-6 lg:px-8 lg:pb-10">
            <Outlet />
          </main>
        </div>
      </div>
      <MobileNav />
      <NewAppointmentDialog />
    </div>
  );
}

function SidebarContent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const requests = useStore((s) => s.requests.length);
  const plan = useStore((s) => s.settings.plan);
  return (
    <div className="flex h-full flex-col py-6">
      <div className="px-6 pb-8">
        <Link to="/hoje" aria-label="PediFlux — início">
          <Logo size="md" />
        </Link>
      </div>
      <nav className="grid gap-1">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative mx-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-teal/10 font-bold text-navy"
                  : "font-medium text-muted-foreground hover:bg-muted hover:text-navy",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", active && "text-teal")} />
              {label}
              {to === "/hoje" && requests > 0 && (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-orange px-1.5 text-[11px] font-bold text-white">
                  {requests}
                </span>
              )}
              {active && (
                <span className="absolute -right-3 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-teal" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto grid gap-3 px-4">
        <Link
          to="/configuracoes"
          className="rounded-2xl border border-teal/20 bg-teal/8 p-4 transition hover:bg-teal/12"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-navy">
            <Sparkles className="h-4 w-4 text-teal" /> {plan.name}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Renova em {formatDate(plan.renewal)}
          </span>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-navy"
        >
          <LogOut className="h-[18px] w-[18px]" /> Sair
        </Link>
      </div>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const settings = useStore((s) => s.settings);
  const requests = useStore((s) => s.requests.length);
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-20 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenu}
          aria-label="Abrir menu"
        >
          <Menu />
        </Button>
        <Link to="/hoje" className="shrink-0 lg:hidden" aria-label="PediFlux — início">
          <LogoMark className="h-8 w-8 sm:hidden" />
          <Logo size="sm" className="hidden sm:inline-flex" />
        </Link>
        <GlobalSearch />
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            to="/hoje"
            className="relative grid h-10 w-10 place-items-center rounded-full bg-card text-navy shadow-soft transition hover:text-teal"
            aria-label={`${requests} pedidos de agendamento`}
          >
            <Bell className="h-[18px] w-[18px]" />
            {requests > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-orange ring-2 ring-card" />
            )}
          </Link>
          <Button
            variant="brand"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => actions.openNewAppt()}
            aria-label="Nova consulta"
            title="Nova consulta"
          >
            <Plus />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 pr-1 outline-none ring-teal focus-visible:ring-2">
              <Avatar name={settings.doctorName} size="md" />
              <span className="hidden text-left leading-tight xl:block">
                <span className="block text-sm font-bold text-navy">{settings.doctorShort}</span>
                <span className="block text-xs text-muted-foreground">{settings.crm}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground xl:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {settings.doctorName}
                <span className="block text-xs font-normal text-muted-foreground">
                  {settings.specialty}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/configuracoes" })}>
                <SettingsIcon /> Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/" })}>
                <LogOut /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function GlobalSearch() {
  const patients = useStore((s) => s.patients);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return patients
      .filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          p.guardianName.toLowerCase().includes(t) ||
          p.phone.includes(t),
      )
      .slice(0, 6);
  }, [q, patients]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(id: string) {
    setQ("");
    setOpen(false);
    navigate({ to: "/pacientes/$id", params: { id } });
  }

  return (
    <div ref={ref} className="relative hidden w-full max-w-md md:block">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setIdx(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setIdx((i) => Math.min(i + 1, results.length - 1));
          if (e.key === "ArrowUp") setIdx((i) => Math.max(i - 1, 0));
          if (e.key === "Enter" && results[idx]) go(results[idx].id);
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Buscar paciente, mãe ou pai…"
        className="h-11 rounded-full border-transparent bg-card pl-10 shadow-soft focus-visible:border-teal"
        aria-label="Buscar paciente"
      />
      {open && q.trim() && (
        <div className="absolute inset-x-0 top-12 z-40 overflow-hidden rounded-xl border border-border bg-popover shadow-lift">
          {results.length ? (
            results.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onMouseEnter={() => setIdx(i)}
                onClick={() => go(p.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left",
                  i === idx && "bg-accent",
                )}
              >
                <Avatar name={p.name} sex={p.sex} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatAge(p.birthDate)} · {p.guardianRelation}: {p.guardianName}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}

function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || pathname.startsWith(`${to}/`);
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold",
              active ? "text-teal" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            {label === "Configurações" ? "Ajustes" : label}
          </Link>
        );
      })}
    </nav>
  );
}
