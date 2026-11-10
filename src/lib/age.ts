const DAY = 86400000;

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];
const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function formatLongDate(iso: string): string {
  const d = parseISO(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[parseISO(iso).getDay()];
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / DAY);
}

export function ageInMonths(birth: string, at: string = todayISO()): number {
  return daysBetween(birth, at) / 30.4375;
}

/** "12 dias", "8 meses", "1 ano", "2 anos e 3 meses" */
export function formatAge(birth: string, at: string = todayISO()): string {
  const days = daysBetween(birth, at);
  if (days < 0) return "—";
  if (days < 30) return `${days} ${days === 1 ? "dia" : "dias"}`;
  const b = parseISO(birth);
  const r = parseISO(at);
  let months = (r.getFullYear() - b.getFullYear()) * 12 + (r.getMonth() - b.getMonth());
  if (r.getDate() < b.getDate()) months -= 1;
  months = Math.max(months, 1);
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  const ys = `${y} ${y === 1 ? "ano" : "anos"}`;
  return m ? `${ys} e ${m} ${m === 1 ? "mês" : "meses"}` : ys;
}

export function formatAgeMonths(months: number): string {
  if (months < 1) return `${Math.round(months * 30.4375)} dias`;
  const total = Math.floor(months);
  if (total < 12) return `${total} ${total === 1 ? "mês" : "meses"}`;
  const y = Math.floor(total / 12);
  const m = total % 12;
  const ys = `${y} ${y === 1 ? "ano" : "anos"}`;
  return m ? `${ys} e ${m} ${m === 1 ? "mês" : "meses"}` : ys;
}

export function firstName(name: string): string {
  return name.split(" ")[0];
}

export function initials(name: string): string {
  const p = name
    .replace(/^(Dra?\.)\s*/, "")
    .split(" ")
    .filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
}

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function whatsappLink(phone: string, text: string): string {
  const digits = onlyDigits(phone);
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

export function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
