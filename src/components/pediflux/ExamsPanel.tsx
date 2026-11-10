import { useMemo, useRef, useState } from "react";
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
import { actions, fillMessage, useStore } from "@/data/store";
import type { ExamFile, Patient } from "@/data/types";
import { firstName, formatDate, todayISO, whatsappLink } from "@/lib/age";
import { cn } from "@/lib/utils";

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
          (exam.kind === "image" ? (
            <ExamThumb exam={exam} className="h-80 rounded-2xl" />
          ) : (
            <div className="max-h-[55vh] overflow-y-auto rounded-2xl bg-muted p-4 sm:p-6">
              <div className="mx-auto max-w-md rounded-lg bg-card p-6 shadow-soft">
                <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                  <span className="flex items-center gap-2 text-sm font-bold text-navy">
                    <LogoMark className="h-6 w-6" /> {settings.clinicName}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(exam.date)}</span>
                </div>
                <p className="text-base font-extrabold text-navy">{exam.name}</p>
                <p className="mb-4 text-xs text-muted-foreground">Paciente: {patient.name}</p>
                {[95, 80, 88, 60, 92, 75, 84, 50].map((w, i) => (
                  <div key={i} className="mb-2 h-2 rounded bg-muted" style={{ width: `${w}%` }} />
                ))}
                <p className="mt-6 text-center text-xs text-muted-foreground">
                  Pré-visualização de demonstração
                </p>
              </div>
            </div>
          ))}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => toast.success("Download iniciado (demonstração)")}
          >
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
  const input = useRef<HTMLInputElement>(null);

  const list = exams
    .filter((e) => filter === "Todos" || e.category === filter)
    .sort((a, b) => b.date.localeCompare(a.date));
  const counts = (c: string) => exams.filter((e) => e.category === c).length;

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const kind: ExamFile["kind"] = file.type.startsWith("image/") ? "image" : "pdf";
      const name = file.name.replace(/\.[^.]+$/, "");
      actions.addExam({
        patientId: patient.id,
        name,
        kind,
        category: guessCategory(name, kind),
        date: todayISO(),
      });
    }
    toast.success(files.length > 1 ? `${files.length} arquivos enviados` : "Arquivo enviado", {
      description: "Disponível na ficha do paciente.",
    });
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
        <p className="font-bold text-navy">Arraste exames e documentos aqui</p>
        <p className="text-sm text-muted-foreground">ou clique para escolher · PDF, JPG ou PNG</p>
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,image/*"
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
