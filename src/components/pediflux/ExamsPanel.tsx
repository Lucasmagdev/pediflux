import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, ImageIcon, MessageCircle, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, EmptyState } from "./ui";
import { Pill } from "./StatusBadge";
import { LogoMark } from "./Logo";
import { actions, examUrl, fillMessage, openExam, useStore } from "@/data/store";
import type { ExamFile, Patient } from "@/data/types";
import { firstName, formatDate, todayISO, whatsappLink } from "@/lib/age";
import { cn } from "@/lib/utils";

/** Mesmo limite do bucket `exams` no Supabase. */
const MAX_BYTES = 20 * 1024 * 1024;

const CATEGORIES: ExamFile["category"][] = [
  "Exame de sangue",
  "Imagem",
  "Laudo",
  "Receita",
  "Atestado",
  "Outro",
];

function guessCategory(name: string, kind: ExamFile["kind"]): ExamFile["category"] {
  const n = name.toLowerCase();
  if (/hemo|ferrit|vitamina|sangue|glic|tsh/.test(n)) return "Exame de sangue";
  if (/receita/.test(n)) return "Receita";
  if (/atestado/.test(n)) return "Atestado";
  if (/laudo|teste/.test(n)) return "Laudo";
  return kind === "image" ? "Imagem" : "Outro";
}

export function ExamThumb({ exam, className }: { exam: ExamFile; className?: string }) {
  return exam.kind === "image" ? (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_30%_30%,oklch(0.45_0.05_250),oklch(0.18_0.03_258))]",
        className,
      )}
    >
      <div className="h-2/3 w-1/2 rounded-[45%] bg-white/15 blur-[2px]" />
      <ImageIcon className="absolute bottom-2 right-2 h-4 w-4 text-white/70" />
    </div>
  ) : (
    <div className={cn("grid place-items-center bg-accent", className)}>
      <div className="w-3/5 rounded-md bg-card p-2 shadow-soft">
        <div className="mb-1.5 h-1.5 w-1/2 rounded bg-teal/60" />
        {[90, 70, 85, 60].map((w, i) => (
          <div
            key={i}
            className="mb-1 h-1 rounded bg-muted-foreground/20"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ExamViewer({
  exam,
  patient,
  onClose,
}: {
  exam: ExamFile | null;
  patient: Patient;
  onClose: () => void;
}) {
  const settings = useStore((s) => s.settings);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (exam) examUrl(exam).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [exam]);
  return (
    <Dialog open={!!exam} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{exam?.name}</DialogTitle>
          <DialogDescription>
            {exam?.category} · {formatDate(exam?.date)} · {patient.name}
          </DialogDescription>
        </DialogHeader>
        {exam &&
          (!url ? (
            <div className="grid h-80 place-items-center rounded-2xl bg-muted text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <LogoMark className="h-6 w-6 animate-pulse" /> Carregando arquivo…
              </span>
            </div>
          ) : exam.kind === "image" ? (
            <img
              src={url}
              alt={exam.name}
              className="max-h-[60vh] w-full rounded-2xl bg-muted object-contain"
            />
          ) : (
            <iframe
              src={url}
              title={exam.name}
              className="h-[60vh] w-full rounded-2xl border border-border bg-muted"
            />
          ))}
        <DialogFooter>
          <Button variant="outline" onClick={() => exam && openExam(exam, true)}>
            <Download /> Baixar
          </Button>
          <Button variant="success" asChild>
            <a
              href={whatsappLink(
                patient.phone,
                fillMessage(settings.messages.result, {
                  responsavel: firstName(patient.guardianName),
                  paciente: firstName(patient.name),
                }),
              )}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle /> Avisar a família
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExamsPanel({ patient }: { patient: Patient }) {
  const allExams = useStore((s) => s.exams);
  const exams = useMemo(
    () => allExams.filter((e) => e.patientId === patient.id),
    [allExams, patient.id],
  );
  const [filter, setFilter] = useState<ExamFile["category"] | "Todos">("Todos");
  const [drag, setDrag] = useState(false);
  const [viewing, setViewing] = useState<ExamFile | null>(null);
  const [uploading, setUploading] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const list = exams
    .filter((e) => filter === "Todos" || e.category === filter)
    .sort((a, b) => b.date.localeCompare(a.date));
  const counts = (c: string) => exams.filter((e) => e.category === c).length;

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    const tooBig = list.filter((f) => f.size > MAX_BYTES);
    if (tooBig.length) {
      toast.error(`Arquivo acima de 20 MB: ${tooBig.map((f) => f.name).join(", ")}`);
    }
    const ok = list.filter((f) => f.size <= MAX_BYTES);
    if (!ok.length) return;
    setUploading((n) => n + ok.length);
    let sent = 0;
    for (const file of ok) {
      const kind: ExamFile["kind"] = file.type.startsWith("image/") ? "image" : "pdf";
      const name = file.name.replace(/\.[^.]+$/, "").slice(0, 200) || "Arquivo";
      const done = await actions.addExam(
        {
          patientId: patient.id,
          name,
          kind,
          category: guessCategory(name, kind),
          date: todayISO(),
        },
        file,
      );
      if (done) sent++;
      setUploading((n) => n - 1);
    }
    if (sent) {
      toast.success(sent > 1 ? `${sent} arquivos enviados` : "Arquivo enviado", {
        description: "Disponível na ficha do paciente.",
      });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition",
          drag
            ? "border-teal bg-teal/8"
            : "border-border bg-card hover:border-teal/50 hover:bg-accent/40",
        )}
      >
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-brand text-white shadow-soft">
          <UploadCloud className="h-6 w-6" />
        </span>
        <p className="font-bold text-navy">
          {uploading ? `Enviando ${uploading} arquivo(s)…` : "Arraste exames e documentos aqui"}
        </p>
        <p className="text-sm text-muted-foreground">
          ou clique para escolher · PDF, JPG ou PNG até 20 MB
        </p>
        <input
          ref={input}
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["Todos", ...CATEGORIES.filter((c) => counts(c) > 0)] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              filter === c
                ? "border-teal bg-teal text-white"
                : "border-border bg-card text-muted-foreground hover:text-navy",
            )}
          >
            {c}{" "}
            {c !== "Todos" && counts(c) > 0 && <span className="opacity-70">({counts(c)})</span>}
          </button>
        ))}
      </div>

      {list.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {list.map((e) => (
            <Card
              key={e.id}
              className="group relative overflow-hidden transition hover:shadow-lift"
            >
              <button
                type="button"
                onClick={() => setViewing(e)}
                className="block w-full text-left"
              >
                <ExamThumb exam={e} className="h-32" />
                <div className="p-3">
                  <p className="truncate text-sm font-bold text-navy">{e.name}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{formatDate(e.date)}</span>
                    <Pill tone={e.kind === "image" ? "info" : "teal"}>
                      {e.kind === "image" ? (
                        <ImageIcon className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      {e.kind === "image" ? "Imagem" : "PDF"}
                    </Pill>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  actions.removeExam(e.id);
                  toast("Arquivo removido");
                }}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-card/90 text-muted-foreground shadow-soft transition hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Remover arquivo"
                title="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={FileText}
            title="Nenhum arquivo aqui"
            text="Envie exames, laudos, receitas e atestados para ficarem guardados no histórico."
          />
        </Card>
      )}

      <ExamViewer exam={viewing} patient={patient} onClose={() => setViewing(null)} />
    </div>
  );
}
