"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { supabase, type ParticipantRow } from "@/lib/supabase";
import {
  COMMON_TIMEZONES,
  currentWeekAnchor,
  detectTimezone,
} from "@/lib/time";

function saveMe(
  eventId: string,
  me: { id: string; name: string; timezone: string }
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`coincidir:me:${eventId}`, JSON.stringify(me));
}

export default function CreateEventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // detectTimezone usa Intl en cliente; no puede ejecutarse durante SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimezone(detectTimezone());
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const id = nanoid(10);
      const trimmedTitle = title.trim() || "Sin nombre";
      const trimmedName = name.trim() || "Anónimo";

      const { error: eventErr } = await supabase.from("events").insert({
        id,
        title: trimmedTitle,
        organizer_name: trimmedName,
        organizer_timezone: timezone,
        week_anchor: currentWeekAnchor(),
        day_start_hour: 6,
        day_end_hour: 24,
      });
      if (eventErr) throw eventErr;

      const { data: pData, error: pErr } = await supabase
        .from("participants")
        .insert({ event_id: id, name: trimmedName, timezone })
        .select()
        .single();
      if (pErr) throw pErr;

      const p = pData as ParticipantRow;
      saveMe(id, { id: p.id, name: p.name, timezone: p.timezone });
      router.push(`/e/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="border border-[var(--line)] bg-[var(--bg-card)] p-6 sm:p-8 lg:p-10"
    >
      <header className="mb-7 border-b border-[var(--line-soft)] pb-5 sm:mb-8 sm:pb-6">
        <h2 className="font-display text-3xl leading-[1.05] tracking-tight text-[var(--gold)] sm:text-4xl">
          Coordina
          <br />
          <span className="text-[var(--gold-bright)]">tu reunión.</span>
        </h2>
        <p className="mt-3 font-display text-base text-[var(--ink-soft)] sm:text-lg">
          En 30 segundos.
        </p>
      </header>

      <div className="space-y-6 sm:space-y-7">
        <Field label="Nombre del grupo">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Equipo de diseño"
            className="input"
            required
            autoFocus
          />
        </Field>

        <Field label="Tu nombre">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como te conocen"
            className="input"
            required
          />
        </Field>

        <Field label="Tu zona horaria">
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="input appearance-none"
          >
            {!COMMON_TIMEZONES.includes(timezone) && (
              <option value={timezone}>{timezone} (detectada)</option>
            )}
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>

        {error && (
          <div className="border-l-2 border-[var(--gold)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--ink)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? "Creando..." : "Crear grupo →"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-faint)]">
        {label}
      </span>
      {children}
    </label>
  );
}
