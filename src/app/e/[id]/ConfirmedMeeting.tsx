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
    `DTSTAMP:${toICSDate(start)}`,
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 sm:h-7 sm:w-7">
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

type Props = {
  slot: Date;
  timezone: string;
  title: string;
  emails: string[];
  myEmail: string;
  onEmailChange: (email: string) => void;
  isAdmin: boolean;
  onUnconfirm: () => void;
  floating?: boolean;
  onClose?: () => void;
};

export default function ConfirmedMeeting({
  slot,
  timezone,
  title,
  emails,
  myEmail,
  onEmailChange,
  isAdmin,
  onUnconfirm,
  floating = false,
  onClose,
}: Props) {
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

  const center = floating ? "text-center" : "text-left";

  const content = (
    <div
      className={`banner-coordinada relative overflow-hidden border border-[var(--green)] bg-gradient-to-br from-[var(--bg-soft)] to-[var(--bg-card)] ${
        floating ? "p-7 sm:p-9" : "px-5 py-5 sm:px-7 sm:py-6"
      }`}
    >
      <div
        className={`flex flex-col ${floating ? "items-center" : "items-start"}`}
      >
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--green)] bg-[var(--bg)] text-[var(--green-bright)] sm:h-14 sm:w-14">
          <CheckIcon />
        </span>
        <p
          className={`${center} text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--green)] sm:text-[11px]`}
        >
          La reunión quedó coordinada
        </p>
        <p
          className={`${center} mt-2 font-display text-2xl leading-tight text-[var(--green-bright)] first-letter:uppercase sm:text-3xl`}
        >
          {fecha}
        </p>
        <p
          className={`${center} font-display text-3xl tabular-nums text-[var(--green)] sm:text-4xl`}
        >
          {hora}
        </p>
        <p
          className={`${center} mt-1.5 text-xs text-[var(--ink-soft)] sm:text-sm`}
        >
          En tu zona horaria · {timezone}
        </p>
      </div>

      <div className={`mt-5 ${floating ? "mx-auto max-w-sm" : "max-w-sm"}`}>
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-faint)]">
            Tu email para sumarte a la reunión
          </span>
          <input
            type="email"
            key={myEmail}
            defaultValue={myEmail}
            onBlur={(e) => onEmailChange(e.target.value)}
            placeholder="tu@email.com"
            className="input"
          />
        </label>
      </div>

      <div
        className={`mt-5 flex flex-wrap items-center gap-3 ${
          floating ? "justify-center" : ""
        }`}
      >
        <a
          href={googleCalendarUrl(slot, calTitle, details, emails)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center bg-[var(--green)] px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-[var(--bg)] transition hover:bg-[var(--green-bright)]"
        >
          Agendar en Google Calendar
        </a>
        <button
          onClick={() => downloadICS(slot, calTitle, details, emails)}
          className="inline-flex items-center justify-center border border-[var(--green)] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[var(--green)] transition hover:bg-[var(--green)]/10"
        >
          Descargar .ics
        </button>
      </div>

      <p
        className={`${center} mt-3 text-[10px] leading-relaxed text-[var(--ink-faint)]`}
      >
        Para la videollamada, abrí el evento en Google Calendar y activá Google
        Meet.
      </p>

      {floating && (
        <button
          onClick={onClose}
          className="mt-6 w-full border border-[var(--line)] py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--ink-soft)] transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
        >
          Listo
        </button>
      )}

      {!floating && isAdmin && (
        <button
          onClick={onUnconfirm}
          className="mt-4 text-[10px] uppercase tracking-wider text-[var(--ink-faint)] underline-offset-4 hover:text-[var(--ink-soft)] hover:underline"
        >
          Deshacer
        </button>
      )}
    </div>
  );

  if (!floating) return content;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto">
        {content}
      </div>
    </div>
  );
}
