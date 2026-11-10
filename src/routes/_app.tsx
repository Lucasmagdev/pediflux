import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
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
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <SidebarContent />
      </aside>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 border-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 lg:pb-16 sm:px-6 lg:px-8">
          <Outlet />
        </main>
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
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <Link to="/hoje" aria-label="PediFlux — início">
          <Logo size="sm" onDark />
        </Link>
      </div>
      <nav className="grid gap-1 px-3">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                active
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-lg transition",
                  active
                    ? "bg-teal text-white"
                    : "bg-white/5 text-sidebar-foreground/80 group-hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {label}
              {to === "/hoje" && requests > 0 && (
                <span className="ml-auto rounded-full bg-warning px-2 py-0.5 text-xs font-bold text-navy">
                  {requests}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4">
        <div className="rounded-2xl bg-gradient-brand p-4 text-white shadow-lift">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Sparkles className="h-4 w-4" /> {plan.name}
          </div>
          <p className="mt-1 text-xs text-white/85">
            Assinatura {plan.status.toLowerCase()} · renova em {formatDate(plan.renewal)}
          </p>
          <Link
            to="/configuracoes"
            className="mt-3 inline-flex rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/30"
          >
            Ver assinatura
          </Link>
        </div>
      </div>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const settings = useStore((s) => s.settings);
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
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
        <Button
          variant="brand"
          className="ml-auto hidden sm:inline-flex"
          onClick={() => actions.openNewAppt()}
        >
          <Plus /> Nova consulta
        </Button>
        <Button
          variant="brand"
          size="icon"
          className="ml-auto sm:hidden"
          onClick={() => actions.openNewAppt()}
          aria-label="Nova consulta"
        >
          <Plus />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 outline-none ring-teal focus-visible:ring-2">
            <Avatar name={settings.doctorName} size="md" />
            <span className="hidden text-left leading-tight xl:block">
              <span className="block text-sm font-bold text-navy">{settings.doctorShort}</span>
              <span className="block text-xs text-muted-foreground">{settings.crm}</span>
            </span>
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
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
        className="h-10 rounded-xl border-transparent bg-muted pl-9 focus-visible:border-teal focus-visible:bg-card"
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
