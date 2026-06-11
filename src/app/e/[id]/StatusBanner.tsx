"use client";

import {
  WEEKDAY_LABELS,
  formatInTz,
  weekdayIndex,
  type SlotResult,
} from "@/lib/time";

export type BannerStatus =
  | { kind: "waiting"; pending: string[]; published: number; total: number }
  | { kind: "matched"; block: SlotResult; total: number }
  | { kind: "partial"; block: SlotResult; total: number }
  | { kind: "none"; total: number };

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 sm:h-6 sm:w-6">
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7v5l3.5 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M12 3l9.5 16.5H2.5L12 3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.3" r="0.4" fill="currentColor" stroke="currentColor" />
    </svg>
  );
}

export default function StatusBanner({
  status,
  timezone,
}: {
  status: BannerStatus;
  timezone: string;
}) {
  // ✓ TODOS COINCIDEN — el momento de triunfo
  if (status.kind === "matched") {
    const day = WEEKDAY_LABELS[weekdayIndex(status.block.start, timezone)];
    const time = formatInTz(status.block.start, timezone, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="banner-coordinada relative overflow-hidden border border-[var(--gold)] bg-gradient-to-br from-[var(--bg-soft)] to-[var(--bg-card)] px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--gold)] sm:text-[11px]">
              Reunión coordinada
            </p>
            <p className="mt-2 font-display text-2xl leading-tight text-[var(--gold-bright)] sm:text-4xl">
              {day}{" "}
              <span className="tabular-nums">{time}</span>
            </p>
            <p className="mt-1.5 text-xs text-[var(--ink-soft)] sm:text-sm">
              Coinciden las {status.total} personas · {timezone}
            </p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[var(--gold)] bg-[var(--bg)] text-[var(--gold-bright)] sm:h-14 sm:w-14">
            <CheckIcon />
          </span>
        </div>
      </div>
    );
  }

  // Todos publicaron, pero no coincide el grupo completo
  if (status.kind === "partial") {
    const day = WEEKDAY_LABELS[weekdayIndex(status.block.start, timezone)];
    const time = formatInTz(status.block.start, timezone, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="border border-[var(--line)] border-l-2 border-l-[var(--gold)] bg-[var(--bg-card)] px-5 py-4 sm:px-6 sm:py-5">
        <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--gold)] sm:text-[11px]">
          <AlertIcon /> Sin coincidencia total
        </p>
        <p className="mt-2 text-sm text-[var(--ink)] sm:text-base">
          Todos publicaron, pero no hay ningún horario donde coincidan las{" "}
          {status.total} personas.
        </p>
        <p className="mt-2.5 text-sm text-[var(--ink-soft)]">
          Mejor opción:{" "}
          <span className="font-display text-[var(--gold)]">
            {day} {time}
          </span>{" "}
          — {status.block.attendees.length} de {status.total}.
        </p>
        {status.block.missing.length > 0 && (
          <p className="mt-1 text-xs text-[var(--ink-faint)]">
            No puede: {status.block.missing.join(", ")}. Pueden editar sus
            bloques para encontrar uno en común.
          </p>
        )}
      </div>
    );
  }

  // Todos publicaron, pero los bloques no se cruzan en ningún horario
  if (status.kind === "none") {
    return (
      <div className="border border-[var(--line)] border-l-2 border-l-[var(--brown-warm)] bg-[var(--bg-card)] px-5 py-4 sm:px-6 sm:py-5">
        <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--ink-soft)] sm:text-[11px]">
          <AlertIcon /> Sin horarios en común
        </p>
        <p className="mt-2 text-sm text-[var(--ink)] sm:text-base">
          Todos publicaron, pero sus bloques libres no se cruzan en ningún
          horario.
        </p>
        <p className="mt-1.5 text-xs text-[var(--ink-faint)]">
          Pueden volver a editar sus bloques para encontrar uno que les sirva a
          todos.
        </p>
      </div>
    );
  }

  // Falta gente por publicar
  const { pending, published, total } = status;
  return (
    <div className="border border-[var(--line)] border-l-2 border-l-[var(--ink-faint)] bg-[var(--bg-card)] px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--ink-soft)] sm:text-[11px]">
          <ClockIcon /> Esperando publicaciones
        </p>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
          {published}/{total} publicaron
        </p>
      </div>
      <p className="mt-2 text-sm text-[var(--ink)] sm:text-base">
        {pending.length === 1
          ? "Falta que publique 1 persona."
          : `Faltan ${pending.length} personas por publicar.`}
      </p>
      <p className="mt-1.5 text-xs text-[var(--ink-soft)]">
        Esperando a: {pending.join(", ")}.
      </p>
      <p className="mt-1 text-xs text-[var(--ink-faint)]">
        El horario en común aparece cuando todos publican sus bloques.
      </p>
    </div>
  );
}
