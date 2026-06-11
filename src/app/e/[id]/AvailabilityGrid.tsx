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

function PersonIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="h-2 w-2 sm:h-2.5 sm:w-2.5"
    >
      <circle cx="8" cy="4.5" r="3" />
      <path d="M2 15c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5z" />
    </svg>
  );
}

// Muestra cuántas personas marcaron la celda (solo cuando hay 2+).
// 2 o 3 → ese número de personitas. 4+ → una personita y el número.
function CellMarkers({ count }: { count: number }) {
  if (count < 2) return null;
  return (
    <span
      className="pointer-events-none relative z-[2] flex items-center justify-center gap-[1.5px] text-[8px] font-bold leading-none [filter:drop-shadow(0_0_1.5px_rgba(245,213,154,0.7))] sm:text-[9px]"
      style={{ color: "#2a1608" }}
    >
      {count <= 3 ? (
        Array.from({ length: count }, (_, i) => <PersonIcon key={i} />)
      ) : (
        <>
          <PersonIcon />
          {count}
        </>
      )}
    </span>
  );
}

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

  // Celda sobre la que el cursor/dedo está posado, para mostrar quién marcó.
  const [inspect, setInspect] = useState<{
    iso: string;
    x: number;
    y: number;
  } | null>(null);

  function showInspect(iso: string, x: number, y: number) {
    if (dragRef.current.active) return; // no estorbar mientras se pinta
    setInspect({ iso, x, y });
  }

  // Quiénes marcaron ese slot y quiénes faltan (con sus índices de color).
  function peopleFor(iso: string) {
    const present: { p: ParticipantLite; i: number }[] = [];
    const missing: ParticipantLite[] = [];
    for (let i = 0; i < participants.length; i++) {
      const set = allAvailability[participants[i].id];
      if (set && set.has(iso)) present.push({ p: participants[i], i });
      else missing.push(participants[i]);
    }
    return { present, missing };
  }

  function startDrag(iso: string) {
    if (disabled) return;
    setInspect(null);
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
      className={`border border-[var(--line)] bg-[var(--bg-card)] p-2 sm:p-5 ${
        disabled ? "opacity-60" : ""
      }`}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => {
        endDrag();
        setInspect(null);
      }}
    >
      <div className="grid w-full select-none grid-cols-[24px_repeat(7,1fr)] sm:grid-cols-[52px_repeat(7,minmax(64px,1fr))]">
        <div />
        {WEEKDAY_SHORT.map((d) => (
          <div
            key={d}
            className="pb-2 text-center text-[9px] font-medium uppercase tracking-wider text-[var(--ink-faint)] sm:pb-3 sm:text-[10px] sm:tracking-[0.2em]"
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
            showInspect={showInspect}
          />
        ))}

        {grid.hours.length > 0 && (
          <>
            <div className="flex h-0 items-start justify-end overflow-visible pr-1 text-[9px] leading-none tabular-nums text-[var(--ink-faint)] sm:pr-3 sm:text-[10px]">
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

      {inspect &&
        (() => {
          const { present, missing } = peopleFor(inspect.iso);
          if (present.length === 0) return null;
          const d = new Date(inspect.iso);
          const label = `${WEEKDAY_SHORT[weekdayIndex(d, timezone)]} ${String(
            localHour(d, timezone)
          ).padStart(2, "0")}:00`;
          return (
            <div
              className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full"
              style={{ left: inspect.x, top: inspect.y - 12 }}
            >
              <div className="min-w-[140px] max-w-[220px] border border-[var(--line)] bg-[var(--bg-card)] px-3 py-2 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8)]">
                <p className="font-display text-xs text-[var(--gold)]">
                  {label}
                  <span className="ml-1.5 font-sans text-[10px] font-normal tracking-wider text-[var(--ink-faint)]">
                    {present.length}/{totalGroup}
                  </span>
                </p>
                <ul className="mt-1.5 space-y-1">
                  {present.map(({ p, i }) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-1.5 text-[11px] text-[var(--ink)]"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 border border-[var(--line)]"
                        style={{ backgroundColor: participantColor(i) }}
                      />
                      {p.name}
                    </li>
                  ))}
                </ul>
                {missing.length > 0 && (
                  <p className="mt-1.5 border-t border-[var(--line-soft)] pt-1.5 text-[10px] text-[var(--ink-faint)]">
                    Falta: {missing.map((m) => m.name).join(", ")}
                  </p>
                )}
              </div>
            </div>
          );
        })()}
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
  showInspect,
}: {
  hour: number;
  byCell: Map<string, Date>;
  cellStyle: (iso: string) => React.CSSProperties;
  markersFor: (iso: string) => number[];
  coincidenceClass: (iso: string) => string;
  startDrag: (iso: string) => void;
  dragOver: (iso: string) => void;
  showInspect: (iso: string, x: number, y: number) => void;
}) {
  const hh = String(hour).padStart(2, "0");
  return (
    <>
      <div className="flex items-start justify-end pr-1 text-[9px] leading-none tabular-nums text-[var(--ink-faint)] sm:pr-3 sm:text-[10px]">
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
            className={`flex h-8 cursor-pointer items-center justify-center border border-[var(--line-soft)] transition-colors hover:border-[var(--gold)] sm:h-7 ${coincide}`}
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
            onPointerEnter={(e) => {
              dragOver(iso);
              showInspect(iso, e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (e.pointerType !== "touch") {
                // Mouse: el tooltip sigue al cursor
                showInspect(iso, e.clientX, e.clientY);
                return;
              }
              // Touch: pointerenter no siempre se dispara, usamos elementFromPoint
              const el = document.elementFromPoint(e.clientX, e.clientY);
              if (el instanceof HTMLElement && el.dataset.iso) {
                dragOver(el.dataset.iso);
              }
            }}
            data-iso={iso}
          >
            <CellMarkers count={count} />
          </div>
        );
      })}
    </>
  );
}
