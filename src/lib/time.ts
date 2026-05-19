import type { EventRow } from "./supabase";

export const SLOT_MINUTES = 60; // un slot = 1 hora = una reunión
export const DURATION_MINUTES = 60;

export const COMMON_TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "America/Santiago",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export const WEEKDAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export const WEEKDAY_SHORT = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
] as const;

// Paleta pastel cálida, asignada a cada participante por orden de entrada.
export const PASTEL_PALETTE = [
  "#f4c8a8", // durazno
  "#c8d4e8", // azul polvo
  "#d4e0c4", // verde oliva claro
  "#e8c4d4", // rosa cálido
  "#d8c4e8", // lavanda
  "#f0deb8", // crema
  "#c4e0d4", // menta
  "#e8d0b8", // beige rosado
] as const;

export function participantColor(index: number): string {
  return PASTEL_PALETTE[index % PASTEL_PALETTE.length];
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// Devuelve el lunes (en UTC) de la semana actual como YYYY-MM-DD.
export function currentWeekAnchor(): string {
  const now = new Date();
  const dow = now.getUTCDay(); // 0=domingo
  const diffToMonday = (dow + 6) % 7;
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - diffToMonday
    )
  );
  return monday.toISOString().slice(0, 10);
}

type DateParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  weekday: string;
};

function getParts(date: Date, tz: string): DateParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const out: Partial<DateParts> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") {
      (out as Record<string, string>)[p.type] = p.value;
    }
  }
  if (out.hour === "24") out.hour = "00";
  return out as DateParts;
}

export function zonedTimeToUtc(
  dateStr: string,
  hour: number,
  minute: number,
  tz: string
): Date {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const guess = new Date(`${dateStr}T${hh}:${mm}:00Z`);
  const parts = getParts(guess, tz);
  const asInTz = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offset = asInTz - guess.getTime();
  return new Date(guess.getTime() - offset);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Genera todos los slots UTC: 7 días × (day_end_hour - day_start_hour) horas,
// anclados en la semana del evento e interpretados en la TZ del organizador.
export function generateSlots(event: EventRow): Date[] {
  const slots: Date[] = [];
  const [y, m, d] = event.week_anchor.split("-").map(Number);
  const baseUtc = Date.UTC(y, m - 1, d);
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dayMs = baseUtc + dayOffset * 86400000;
    const dt = new Date(dayMs);
    const dateStr = `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(
      dt.getUTCDate()
    )}`;
    for (let h = event.day_start_hour; h < event.day_end_hour; h++) {
      slots.push(zonedTimeToUtc(dateStr, h, 0, event.organizer_timezone));
    }
  }
  return slots;
}

// Índice de día de la semana en la TZ dada: 0=lunes, 6=domingo.
export function weekdayIndex(date: Date, tz: string): number {
  const w = getParts(date, tz).weekday;
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[w] ?? 0;
}

export function localHour(date: Date, tz: string): number {
  return Number(getParts(date, tz).hour);
}

export function localHourMinute(date: Date, tz: string): string {
  const p = getParts(date, tz);
  return `${p.hour}:${p.minute}`;
}

export function formatInTz(
  date: Date,
  tz: string,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat("es-AR", { timeZone: tz, ...options }).format(
    date
  );
}

export type SlotResult = {
  start: Date;
  end: Date;
  attendees: string[];
  missing: string[];
};

export function findBestSlots(args: {
  slots: Date[];
  participants: { id: string; name: string }[];
  availability: Record<string, Set<string>>;
  topN?: number;
}): SlotResult[] {
  const { slots, participants, availability } = args;
  const results: SlotResult[] = [];

  for (const slot of slots) {
    const iso = slot.toISOString();
    const attendees: string[] = [];
    const missing: string[] = [];
    for (const p of participants) {
      const set = availability[p.id];
      if (set && set.has(iso)) attendees.push(p.name);
      else missing.push(p.name);
    }
    results.push({
      start: slot,
      end: new Date(slot.getTime() + DURATION_MINUTES * 60000),
      attendees,
      missing,
    });
  }

  results.sort((a, b) => {
    if (b.attendees.length !== a.attendees.length) {
      return b.attendees.length - a.attendees.length;
    }
    return a.start.getTime() - b.start.getTime();
  });

  return results.slice(0, args.topN ?? 5);
}
