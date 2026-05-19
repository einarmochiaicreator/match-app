"use client";

import {
  WEEKDAY_LABELS,
  formatInTz,
  weekdayIndex,
  type SlotResult,
} from "@/lib/time";

type Props = {
  blocks: SlotResult[];
  totalParticipants: number;
  timezone: string;
};

export default function BestSlots({
  blocks,
  totalParticipants,
  timezone,
}: Props) {
  if (totalParticipants === 0) {
    return (
      <div className="border-l-2 border-[var(--line)] pl-4 text-sm text-[var(--ink-faint)]">
        Aún nadie publicó disponibilidad.
      </div>
    );
  }
  if (blocks.length === 0 || blocks[0].attendees.length === 0) {
    return (
      <div className="border-l-2 border-[var(--line)] pl-4 text-sm text-[var(--ink-faint)]">
        No hay horarios coincidentes con los bloques publicados.
      </div>
    );
  }

  const fullMatch = blocks[0].attendees.length === totalParticipants;
  const best = blocks[0];

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--ink-faint)]">
        {fullMatch ? "Horario en común" : "Mejor opción parcial"}
      </p>

      <div className="mt-3 border border-[var(--gold)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-soft)] p-5 shadow-[0_0_30px_-10px_rgba(232,184,122,0.4)]">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--ink-soft)]">
          {fullMatch
            ? `Todos · ${best.attendees.length}/${totalParticipants}`
            : `${best.attendees.length} de ${totalParticipants}`}
        </p>
        <p className="mt-3 font-display text-4xl leading-tight text-[var(--gold-bright)]">
          {WEEKDAY_LABELS[weekdayIndex(best.start, timezone)]}
        </p>
        <p className="font-display text-3xl tabular-nums text-[var(--gold)]">
          {formatInTz(best.start, timezone, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-[var(--ink-faint)]">
          {timezone}
        </p>
        {best.missing.length > 0 && (
          <p className="mt-3 text-xs text-[var(--ink-soft)]">
            Falta: {best.missing.join(", ")}
          </p>
        )}
      </div>

      {blocks.length > 1 && (
        <>
          <p className="mt-6 text-[11px] uppercase tracking-[0.3em] text-[var(--ink-faint)]">
            Otras opciones
          </p>
          <ul className="mt-3 divide-y divide-[var(--line-soft)] border-t border-[var(--line-soft)]">
            {blocks.slice(1).map((b, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between py-2.5 text-sm"
              >
                <span className="text-[var(--ink)]">
                  {WEEKDAY_LABELS[weekdayIndex(b.start, timezone)]}{" "}
                  <span className="tabular-nums text-[var(--ink-soft)]">
                    {formatInTz(b.start, timezone, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                  {b.attendees.length}/{totalParticipants}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
