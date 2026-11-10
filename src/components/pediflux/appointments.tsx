import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarClock, Clock, MessageCircle, Play, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_META, STATUS_ORDER, StatusBadge } from "./StatusBadge";
import { Avatar } from "./ui";
import { actions, useStore } from "@/data/store";
import type { Appointment, AppointmentStatus } from "@/data/types";
import { formatAge, formatLongDate, minToTime, timeToMin } from "@/lib/age";
import { cn } from "@/lib/utils";

export function StatusSelect({
  appointment,
  className,
}: {
  appointment: Appointment;
  className?: string;
}) {
  return (
    <Select
      value={appointment.status}
      onValueChange={(v) => {
        actions.setStatus(appointment.id, v as AppointmentStatus);
        toast.success(`Status: ${STATUS_META[v as AppointmentStatus].label}`);
      }}
    >
      <SelectTrigger
        className={cn(
          "h-8 w-auto gap-1 rounded-full border-0 bg-transparent px-0 shadow-none focus:ring-0 [&>svg]:opacity-60",
          className,
        )}
        aria-label="Alterar status"
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue>
          <StatusBadge status={appointment.status} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            <StatusBadge status={s} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function startAttendance(
  appointment: Appointment,
  navigate: ReturnType<typeof useNavigate>,
) {
  actions.setStatus(appointment.id, "em_atendimento");
  navigate({
    to: "/pacientes/$id",
    params: { id: appointment.patientId },
    search: { aba: "consultas", nova: appointment.id },
  });
}

export function AppointmentDetailDialog({
  appointment,
  onOpenChange,
  onWhatsApp,
}: {
  appointment: Appointment | null;
  onOpenChange: (o: boolean) => void;
  onWhatsApp: (a: Appointment) => void;
}) {
  const navigate = useNavigate();
  const live = useStore((s) => s.appointments.find((a) => a.id === appointment?.id) ?? null);
  const patient = useStore((s) => s.patients.find((p) => p.id === live?.patientId));
  if (!live || !patient) return null;
  const end = minToTime(timeToMin(live.time) + live.duration);

  return (
    <Dialog open={!!appointment} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{live.type}</DialogTitle>
          <DialogDescription className="first-letter:uppercase">
            {formatLongDate(live.date)}
          </DialogDescription>
        </DialogHeader>
        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            navigate({ to: "/pacientes/$id", params: { id: patient.id } });
          }}
          className="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition hover:border-teal/50 hover:bg-accent/50"
        >
          <Avatar name={patient.name} sex={patient.sex} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold text-navy">{patient.name}</span>
            <span className="block text-xs text-muted-foreground">
              {formatAge(patient.birthDate)} · {patient.guardianRelation}: {patient.guardianName}
            </span>
          </span>
          <UserRound className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" /> {live.time} – {end} ({live.duration} min)
          </div>
          <div className="flex items-start gap-2 text-muted-foreground">
            <CalendarClock className="mt-0.5 h-4 w-4" />{" "}
            <span className="text-foreground">{live.reason}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted p-3">
            <span className="font-semibold text-navy">Status</span>
            <StatusSelect appointment={live} />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              actions.removeAppointment(live.id);
              toast("Consulta desmarcada");
              onOpenChange(false);
            }}
          >
            <Trash2 /> Desmarcar
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onWhatsApp(live)}>
              <MessageCircle /> Lembrar
            </Button>
            <Button
              variant="brand"
              onClick={() => {
                onOpenChange(false);
                startAttendance(live, navigate);
              }}
            >
              <Play /> Iniciar atendimento
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
