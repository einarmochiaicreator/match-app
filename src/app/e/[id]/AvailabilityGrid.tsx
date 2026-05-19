"use client";

import { useMemo, useRef, useState } from "react";
import {
  WEEKDAY_SHORT,
  hexToRgba,
  localHour,
  participantColor,
  weekdayIndex,
} from "@/lib/time";

type ParticipantLite = { id: string; name: string };

type Props = {
  slots: Date[];
  timezone: string;
  participants: ParticipantLite[]; // ordenados (define colores)
  mySlots: Set<string>;
  allAvailability: Record<string, Set<string>>;
  onChange: (slotIsos: string[], makeAvailable: boolean) => void;
  disabled?: boolean;
};

export default function AvailabilityGrid({
  slots,
  timezone,
  participants,
  mySlots,
  allAvailability,
  onChange,
  disabled = false,
}: Props) {
  const totalGroup = participants.length;

  const grid = useMemo(() => {
    const byCell = new Map<string, Date>();
    const hoursSet = new Set<number>();
    for (const slot of slots) {
      const wd = weekdayIndex(slot, timezone);
      const h = localHour(slot, timezone);
      byCell.set(`${wd}|${h}`, slot);
      hoursSet.add(h);
    }
    // Ordenar cronológicamente: si las horas locales cruzan medianoche
    // (ej. 11..23, 00..04), reordenar comenzando justo después del gap más grande.
    const sorted = Array.from(hoursSet).sort((a, b) => a - b);
    let hours = sorted;
    if (sorted.length > 1) {
      let maxGap = 0;
      let breakIndex = 0;
      for (let i = 0; i < sorted.length; i++) {
        const next = (i + 1) % sorted.length;
        const gap =
          next === 0
            ? 24 - sorted[i] + sorted[next]
            : sorted[next] - sorted[i];
        if (gap > maxGap) {
          maxGap = gap;
          breakIndex = next;
        }
      }
      hours = [...sorted.slice(breakIndex), ...sorted.slice(0, breakIndex)];
    }
    return { byCell, hours };
  }, [slots, timezone]);

  const dragRef = useRef<{
    active: boolean;
    mode: "add" | "remove";
    touched: Set<string>;
  }>({ active: false, mode: "add", touched: new Set() });
  const [, force] = useState(0);

  function startDrag(iso: string) {
    if (disabled) return;
    const willAdd = !mySlots.has(iso);
    dragRef.current = {
      active: true,
      mode: willAdd ? "add" : "remove",
      touched: new Set([iso]),
    };
    onChange([iso], willAdd);
    force((x) => x + 1);
  }

  function dragOver(iso: string) {
    if (disabled) return;
    const d = dragRef.current;
    if (!d.active) return;
    if (d.touched.has(iso)) return;
    d.touched.add(iso);
    const has = mySlots.has(iso);
    if (d.mode === "add" && !has) onChange([iso], true);
    if (d.mode === "remove" && has) onChange([iso], false);
  }

  function endDrag() {
    dragRef.current.active = false;
    dragRef.current.touched.clear();
  }

  // Devuelve los índices de los participantes que marcaron ese slot.
  function markersFor(iso: string): number[] {
    const result: number[] = [];
    for (let i = 0; i < participants.length; i++) {
      const set = allAvailability[participants[i].id];
      if (set && set.has(iso)) result.push(i);
    }
    return result;
  }

  function cellStyle(iso: string): React.CSSProperties {
    const markers = markersFor(iso);
    const count = markers.length;

    if (count === 0) return { backgroundColor: "transparent" };

    // 1 marcador → su color pastel apagado (sin animación, sin glow)
    if (count === 1) {
      return { backgroundColor: hexToRgba(participantColor(markers[0]), 0.38) };
    }

    // 2+ marcadores → dorado. La animación la pone la clase coincide-*
    const isFull = count === totalGroup;
    if (isFull) {
      return { backgroundColor: "#e8b87a" };
    }

    // Opacidad del dorado parcial creciente según ratio
    const total = Math.max(totalGroup, 2);
    const ratio = (count - 1) / (total - 1); // 0..1
    const opacity = 0.45 + ratio * 0.4; // 0.45 .. 0.85
    return {
      backgroundColor: `rgba(232, 184, 122, ${opacity})`,
    };
  }

  // Clase de animación según nivel de coincidencia
  function coincidenceClass(iso: string): string {
    const count = markersFor(iso).length;
    if (count < 2) return "";
    if (totalGroup > 0 && count === totalGroup) return "coincide-explosion";
    const total = Math.max(totalGroup, 2);
    const ratio = (count - 1) / (total - 1);
    return ratio < 0.5 ? "coincide-soft" : "coincide-medium";
  }

  return (
    <div
      className={`overflow-x-auto border border-[var(--line)] bg-[var(--bg-card)] p-3 sm:p-5 ${
        disabled ? "opacity-60" : ""
      }`}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <div className="inline-grid select-none grid-cols-[36px_repeat(7,minmax(38px,1fr))] sm:grid-cols-[52px_repeat(7,minmax(64px,1fr))]">
        <div />
        {WEEKDAY_SHORT.map((d) => (
          <div
            key={d}
            className="pb-3 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-faint)]"
          >
            {d}
          </div>
        ))}

        {grid.hours.map((h) => (
          <Row
            key={h}
            hour={h}
            byCell={grid.byCell}
            cellStyle={cellStyle}
            markersFor={markersFor}
            coincidenceClass={coincidenceClass}
            startDrag={startDrag}
            dragOver={dragOver}
          />
        ))}

        {grid.hours.length > 0 && (
          <>
            <div className="flex h-0 items-start justify-end overflow-visible pr-1.5 text-[9px] leading-none tabular-nums text-[var(--ink-faint)] sm:pr-3 sm:text-[10px]">
              <span className="-translate-y-1/2">
                {String(
                  (grid.hours[grid.hours.length - 1] + 1) % 24 === 0
                    ? 24
                    : (grid.hours[grid.hours.length - 1] + 1) % 24
                ).padStart(2, "0")}
              </span>
            </div>
            {Array.from({ length: 7 }, (_, i) => (
              <div key={`end-${i}`} className="h-0" />
            ))}
          </>
        )}
      </div>

      <Legend participants={participants} totalGroup={totalGroup} />
    </div>
  );
}

function Legend({
  participants,
  totalGroup,
}: {
  participants: ParticipantLite[];
  totalGroup: number;
}) {
  return (
    <div className="mt-4 space-y-3 border-t border-[var(--line-soft)] pt-3 sm:mt-5 sm:pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--ink-faint)] sm:text-[10px]">
          Cada uno
        </span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {participants.map((p, i) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 text-[10px] text-[var(--ink-soft)] sm:text-xs"
            >
              <span
                className="inline-block h-3 w-3 border border-[var(--line)]"
                style={{ backgroundColor: participantColor(i) }}
              />
              {p.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--ink-faint)] sm:text-[10px]">
          Coincidencias
        </span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-[var(--ink-soft)] sm:text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="coincide-soft inline-block h-3 w-3 border border-[var(--line)]"
              style={{ backgroundColor: "rgba(232, 184, 122, 0.5)" }}
            />
            2
          </span>
          {totalGroup >= 4 && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="coincide-medium inline-block h-3 w-3 border border-[var(--line)]"
                style={{ backgroundColor: "rgba(232, 184, 122, 0.75)" }}
              />
              3
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span
              className="coincide-explosion inline-block h-3 w-3 border border-[var(--line)]"
              style={{ backgroundColor: "#e8b87a" }}
            />
            Todos
          </span>
        </div>
      </div>

      <p className="text-[10px] text-[var(--ink-faint)] sm:text-xs">
        Haz clic y arrastra para pintar tus bloques libres.
      </p>
    </div>
  );
}

function Row({
  hour,
  byCell,
  cellStyle,
  markersFor,
  coincidenceClass,
  startDrag,
  dragOver,
}: {
  hour: number;
  byCell: Map<string, Date>;
  cellStyle: (iso: string) => React.CSSProperties;
  markersFor: (iso: string) => number[];
  coincidenceClass: (iso: string) => string;
  startDrag: (iso: string) => void;
  dragOver: (iso: string) => void;
}) {
  const hh = String(hour).padStart(2, "0");
  return (
    <>
      <div className="flex items-start justify-end pr-1.5 text-[9px] leading-none tabular-nums text-[var(--ink-faint)] sm:pr-3 sm:text-[10px]">
        <span className="-translate-y-1/2">{hh}</span>
      </div>
      {Array.from({ length: 7 }, (_, wd) => {
        const slot = byCell.get(`${wd}|${hour}`);
        if (!slot) {
          return (
            <div
              key={wd}
              className="h-7 border border-[var(--line-soft)] bg-[var(--bg-soft)]/40"
            />
          );
        }
        const iso = slot.toISOString();
        const count = markersFor(iso).length;
        const coincide = coincidenceClass(iso);
        return (
          <div
            key={iso}
            role="button"
            tabIndex={0}
            title={`${count} ${count === 1 ? "marcó" : "marcaron"}`}
            className={`h-8 cursor-pointer border border-[var(--line-soft)] transition-colors hover:border-[var(--gold)] sm:h-7 ${coincide}`}
            style={{ ...cellStyle(iso), touchAction: "none" }}
            onPointerDown={(e) => {
              e.preventDefault();
              // Liberar el pointer capture así pointerenter llega a las celdas vecinas
              const el = e.currentTarget as HTMLElement;
              try {
                if (el.hasPointerCapture(e.pointerId)) {
                  el.releasePointerCapture(e.pointerId);
                }
              } catch {
                /* noop */
              }
              startDrag(iso);
            }}
            onPointerEnter={() => dragOver(iso)}
            onPointerMove={(e) => {
              // Para touch: pointerenter no siempre se dispara, usamos elementFromPoint
              if (e.pointerType !== "touch") return;
              const el = document.elementFromPoint(e.clientX, e.clientY);
              if (el instanceof HTMLElement && el.dataset.iso) {
                dragOver(el.dataset.iso);
              }
            }}
            data-iso={iso}
          />
        );
      })}
    </>
  );
}
