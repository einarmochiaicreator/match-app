"use client";

import { formatInTz } from "@/lib/time";

const DURATION_MS = 60 * 60 * 1000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Instante UTC en formato ICS básico: 20260618T210000Z
function toICSDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  );
}

function googleCalendarUrl(
  start: Date,
  title: string,
  details: string,
  emails: string[]
): string {
  const end = new Date(start.getTime() + DURATION_MS);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toICSDate(start)}/${toICSDate(end)}`,
    details,
  });
  if (emails.length > 0) params.set("add", emails.join(","));
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadICS(
  start: Date,
  title: string,
  details: string,
  emails: string[]
) {
  const end = new Date(start.getTime() + DURATION_MS);
  const uid = `match-${start.getTime()}@match-app`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Match//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(new Date(start.getTime()))}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${details}`,
    ...emails.map((e) => `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${e}`),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reunion-match.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ConfirmedMeeting({
  slot,
  timezone,
  title,
  emails,
  isAdmin,
  onUnconfirm,
}: {
  slot: Date;
  timezone: string;
  title: string;
  emails: string[];
  isAdmin: boolean;
  onUnconfirm: () => void;
}) {
  const fecha = formatInTz(slot, timezone, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hora = formatInTz(slot, timezone, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const calTitle = `Reunión · ${title}`;
  const details =
    "Reunión coordinada con Match. Para sumar Google Meet, abrí el evento en Google Calendar y activá la videollamada.";

  return (
    <div className="banner-coordinada relative overflow-hidden border border-[var(--green)] bg-gradient-to-br from-[var(--bg-soft)] to-[var(--bg-card)] px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--green)] sm:text-[11px]">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M5 12.5l4.5 4.5L19 7"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Reunión confirmada
          </p>
          <p className="mt-2 font-display text-2xl capitalize leading-tight text-[var(--green-bright)] sm:text-3xl">
            {fecha}
          </p>
          <p className="font-display text-3xl tabular-nums text-[var(--green)] sm:text-4xl">
            {hora}
          </p>
          <p className="mt-1.5 text-xs text-[var(--ink-soft)] sm:text-sm">
            En tu zona horaria · {timezone}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a
          href={googleCalendarUrl(slot, calTitle, details, emails)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center bg-[var(--green)] px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-[var(--bg)] transition hover:bg-[var(--green-bright)]"
        >
          Agregar a Google Calendar
        </a>
        <button
          onClick={() => downloadICS(slot, calTitle, details, emails)}
          className="inline-flex items-center justify-center border border-[var(--green)] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[var(--green)] transition hover:bg-[var(--green)]/10"
        >
          Descargar .ics
        </button>
        {isAdmin && (
          <button
            onClick={onUnconfirm}
            className="text-[10px] uppercase tracking-wider text-[var(--ink-faint)] underline-offset-4 hover:text-[var(--ink-soft)] hover:underline"
          >
            Deshacer
          </button>
        )}
      </div>
    </div>
  );
}
