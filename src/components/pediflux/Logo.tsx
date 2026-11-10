import { cn } from "@/lib/utils";

/** Logo provisória do PediFlux — substitua apenas este componente pela logo final. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-9 w-9", className)} aria-hidden="true">
      <defs>
        <linearGradient id="pf-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#16B9B3" />
          <stop offset="1" stopColor="#1E6FD9" />
        </linearGradient>
      </defs>
      <path
        d="M18 4h12a2 2 0 0 1 2 2v10h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H32v10a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V32H6a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2h10V6a2 2 0 0 1 2-2z"
        fill="url(#pf-grad)"
      />
      <circle cx="24" cy="23" r="8.5" fill="#fff" />
      <circle cx="21" cy="21.5" r="1.1" fill="#0B2E5E" />
      <circle cx="27" cy="21.5" r="1.1" fill="#0B2E5E" />
      <path d="M20.8 25.2c1.8 2 4.6 2 6.4 0" stroke="#0B2E5E" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M23 14.8c.6-1.2 2.2-1.2 2.4 0" stroke="#0B2E5E" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M33 36c0 4 3 6 6 5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="39.5" cy="40.5" r="2.2" fill="#fff" />
    </svg>
  );
}

export function Logo({
  className,
  size = "md",
  inverted = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
}) {
  const mark = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-14 w-14" }[size];
  const text = { sm: "text-lg", md: "text-xl", lg: "text-4xl" }[size];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={mark} />
      <span className={cn("font-extrabold tracking-tight", text)}>
        <span className={inverted ? "text-navy-foreground" : "text-navy"}>Pedi</span>
        <span className="text-teal">Flux</span>
      </span>
    </span>
  );
}
