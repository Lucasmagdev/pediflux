import { cn } from "@/lib/utils";

/**
 * Marca oficial do PediFlux (arquivos em /public/brand, gerados de marca/pediflux-logo-original.png).
 * Em fundos escuros ou coloridos use `tile` (ícone) ou `onDark` (logo) — a marca vai sobre branco.
 */
export function LogoMark({ className, tile = false }: { className?: string; tile?: boolean }) {
  const img = (
    <img
      src="/brand/pediflux-mark.png"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("h-9 w-9 object-contain", !tile && className)}
    />
  );
  if (!tile) return img;
  return (
    <span
      className={cn(
        "inline-grid h-10 w-10 shrink-0 place-items-center rounded-[28%] bg-white shadow-soft",
        className,
      )}
    >
      <img
        src="/brand/pediflux-mark.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-[78%] w-[78%] object-contain"
      />
    </span>
  );
}

const HEIGHTS = { sm: "h-7", md: "h-9", lg: "h-14", xl: "h-20" } as const;

export function Logo({
  className,
  size = "md",
  onDark = false,
  tagline = false,
}: {
  className?: string;
  size?: keyof typeof HEIGHTS;
  /** Coloca a logo sobre uma pílula branca (para fundos escuros). */
  onDark?: boolean;
  /** Versão com o slogan "Gestão Inteligente para sua Clínica Pediátrica". */
  tagline?: boolean;
}) {
  const img = (
    <img
      src={tagline ? "/brand/pediflux-logo.png" : "/brand/pediflux-logo-horizontal.png"}
      alt={tagline ? "PediFlux — Gestão Inteligente para sua Clínica Pediátrica" : "PediFlux"}
      draggable={false}
      className={cn("w-auto object-contain", HEIGHTS[size])}
    />
  );
  return (
    <span
      className={cn(
        "inline-flex items-center",
        onDark && "rounded-xl bg-white px-3 py-2 shadow-soft",
        className,
      )}
    >
      {img}
    </span>
  );
}

/** Tela de carregamento com a marca (rotas renderizadas só no cliente). */
export function AppLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface">
      <div className="flex flex-col items-center gap-5 animate-fade-up">
        <Logo size="lg" />
        <span className="h-1 w-32 overflow-hidden rounded-full bg-muted">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-gradient-brand" />
        </span>
      </div>
    </div>
  );
}
