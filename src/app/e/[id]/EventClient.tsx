"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  supabase,
  type AvailabilityRow,
  type EventRow,
  type ParticipantRow,
} from "@/lib/supabase";
import {
  COMMON_TIMEZONES,
  detectTimezone,
  findBestSlots,
  generateSlots,
  participantColor,
} from "@/lib/time";
import AvailabilityGrid from "./AvailabilityGrid";
import BestSlots from "./BestSlots";
import StatusBanner, { type BannerStatus } from "./StatusBanner";

type MeState = { id: string; name: string; timezone: string } | null;

function loadMe(eventId: string): MeState {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`coincidir:me:${eventId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveMe(eventId: string, me: MeState) {
  if (typeof window === "undefined") return;
  if (me) localStorage.setItem(`coincidir:me:${eventId}`, JSON.stringify(me));
  else localStorage.removeItem(`coincidir:me:${eventId}`);
}

export default function EventClient({ id }: { id: string }) {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [me, setMe] = useState<MeState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [eventRes, participantsRes] = await Promise.all([
        supabase.from("events").select("*").eq("id", id).single(),
        supabase
          .from("participants")
          .select("*")
          .eq("event_id", id)
          .order("created_at"),
      ]);
      if (eventRes.error) throw eventRes.error;
      if (participantsRes.error) throw participantsRes.error;

      const evt = eventRes.data as EventRow;
      const parts = (participantsRes.data ?? []) as ParticipantRow[];

      let avail: AvailabilityRow[] = [];
      if (parts.length > 0) {
        const ids = parts.map((p) => p.id);
        const availRes = await supabase
          .from("availability")
          .select("participant_id, slot_start")
          .in("participant_id", ids);
        if (availRes.error) throw availRes.error;
        avail = (availRes.data ?? []) as AvailabilityRow[];
      }

      setEvent(evt);
      setParticipants(parts);
      setAvailability(avail);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el grupo. ¿El enlace es correcto?"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // localStorage solo en cliente; no puede leerse en SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMe(loadMe(id));
    void loadAll();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void loadAll();
    }, 8000);
    const onVis = () => {
      if (document.visibilityState === "visible") void loadAll();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [id, loadAll]);

  const slots = useMemo(() => (event ? generateSlots(event) : []), [event]);

  const availabilityByParticipant = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const row of availability) {
      const iso = new Date(row.slot_start).toISOString();
      if (!map[row.participant_id]) map[row.participant_id] = new Set();
      map[row.participant_id].add(iso);
    }
    return map;
  }, [availability]);

  const mySlots = useMemo(
    () =>
      me
        ? availabilityByParticipant[me.id] ?? new Set<string>()
        : new Set<string>(),
    [me, availabilityByParticipant]
  );

  const publishedParticipants = useMemo(
    () => participants.filter((p) => p.published_at !== null),
    [participants]
  );

  const allPublished =
    participants.length > 0 &&
    publishedParticipants.length === participants.length;

  const meRow = useMemo(
    () => (me ? participants.find((p) => p.id === me.id) ?? null : null),
    [me, participants]
  );

  const iAmPublished = meRow?.published_at != null;

  const bestBlocks = useMemo(() => {
    if (!event || !allPublished) return [];
    return findBestSlots({
      slots,
      participants: publishedParticipants.map((p) => ({
        id: p.id,
        name: p.name,
      })),
      availability: availabilityByParticipant,
      topN: 5,
    });
  }, [
    event,
    slots,
    publishedParticipants,
    availabilityByParticipant,
    allPublished,
  ]);

  const pendingNames = useMemo(
    () => participants.filter((p) => p.published_at == null).map((p) => p.name),
    [participants]
  );

  const status = useMemo<BannerStatus>(() => {
    const total = participants.length;
    if (!allPublished) {
      return {
        kind: "waiting",
        pending: pendingNames,
        published: publishedParticipants.length,
        total,
      };
    }
    const best = bestBlocks[0];
    if (total < 2 || !best || best.attendees.length < 2) {
      return { kind: "none", total };
    }
    if (best.attendees.length === total) {
      return { kind: "matched", block: best, total };
    }
    return { kind: "partial", block: best, total };
  }, [
    allPublished,
    pendingNames,
    publishedParticipants.length,
    participants.length,
    bestBlocks,
  ]);

  const toggleSlots = useCallback(
    async (slotIsos: string[], makeAvailable: boolean) => {
      if (!me || iAmPublished) return;
      setAvailability((prev) => {
        if (makeAvailable) {
          const existing = new Set(
            prev
              .filter((r) => r.participant_id === me.id)
              .map((r) => new Date(r.slot_start).toISOString())
          );
          const toAdd = slotIsos
            .filter((iso) => !existing.has(iso))
            .map((iso) => ({ participant_id: me.id, slot_start: iso }));
          return [...prev, ...toAdd];
        } else {
          const toRemove = new Set(slotIsos);
          return prev.filter(
            (r) =>
              !(
                r.participant_id === me.id &&
                toRemove.has(new Date(r.slot_start).toISOString())
              )
          );
        }
      });

      if (makeAvailable) {
        const rows = slotIsos.map((iso) => ({
          participant_id: me.id,
          slot_start: iso,
        }));
        await supabase.from("availability").upsert(rows, {
          onConflict: "participant_id,slot_start",
          ignoreDuplicates: true,
        });
      } else {
        await supabase
          .from("availability")
          .delete()
          .eq("participant_id", me.id)
          .in("slot_start", slotIsos);
      }
    },
    [me, iAmPublished]
  );

  async function joinAs(name: string, timezone: string) {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = participants.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      const next = {
        id: existing.id,
        name: existing.name,
        timezone: existing.timezone,
      };
      setMe(next);
      saveMe(id, next);
      return;
    }
    const { data, error: insertError } = await supabase
      .from("participants")
      .insert({ event_id: id, name: trimmed, timezone })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    const row = data as ParticipantRow;
    const next = { id: row.id, name: row.name, timezone: row.timezone };
    setMe(next);
    saveMe(id, next);
    setParticipants((prev) => [...prev, row]);
  }

  async function publish() {
    if (!me || iAmPublished) return;
    setPublishing(true);
    const now = new Date().toISOString();
    const { error: e } = await supabase
      .from("participants")
      .update({ published_at: now })
      .eq("id", me.id);
    setPublishing(false);
    if (e) {
      setError(e.message);
      return;
    }
    setParticipants((prev) =>
      prev.map((p) => (p.id === me.id ? { ...p, published_at: now } : p))
    );
  }

  async function unpublish() {
    if (!me) return;
    const { error: e } = await supabase
      .from("participants")
      .update({ published_at: null })
      .eq("id", me.id);
    if (e) {
      setError(e.message);
      return;
    }
    setParticipants((prev) =>
      prev.map((p) => (p.id === me.id ? { ...p, published_at: null } : p))
    );
  }

  function leave() {
    setMe(null);
    saveMe(id, null);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-32 text-[11px] uppercase tracking-[0.3em] text-[var(--ink-faint)]">
        Cargando
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--ink-faint)]">
          Error
        </p>
        <h1 className="mt-3 font-display text-3xl text-[var(--gold)]">
          No se pudo cargar el grupo
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">{error}</p>
        <Link href="/" className="btn-primary mt-8">
          Empezar uno nuevo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8 lg:px-6 lg:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line)] pb-5 sm:mb-10 sm:pb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--ink-faint)] sm:text-[11px]">
            Grupo · {participants.length}{" "}
            {participants.length === 1 ? "persona" : "personas"}
          </p>
          <h1 className="mt-1.5 font-display text-2xl tracking-tight text-[var(--gold)] sm:mt-2 sm:text-3xl lg:text-4xl">
            {event.title}
          </h1>
          <p className="mt-1 text-xs text-[var(--ink-soft)] sm:text-sm">
            {publishedParticipants.length} de {participants.length}{" "}
            {publishedParticipants.length === 1
              ? "ya publicó"
              : "ya publicaron"}{" "}
            sus bloques libres
          </p>
        </div>
        <button onClick={copyLink} className="btn-ghost">
          {copied ? "Enlace copiado ✓" : "Copiar enlace"}
        </button>
      </header>

      {!me ? (
        <JoinForm onJoin={joinAs} error={error} />
      ) : (
        <div className="space-y-6 sm:space-y-8">
        <StatusBanner status={status} timezone={me.timezone} />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px] lg:gap-10">
          <section>
            <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
              <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-[0.3em] text-[var(--ink-faint)] sm:text-[11px]">
                  {me.name} · {me.timezone}
                </p>
                <h2 className="mt-1 font-display text-xl text-[var(--gold)] sm:text-2xl">
                  {iAmPublished
                    ? "Ya publicaste"
                    : "Pinta tus bloques libres"}
                </h2>
              </div>
              <button
                onClick={leave}
                className="shrink-0 text-[10px] uppercase tracking-wider text-[var(--ink-faint)] underline-offset-4 hover:text-[var(--ink-soft)] hover:underline sm:text-[11px]"
              >
                No soy yo
              </button>
            </div>

            <AvailabilityGrid
              slots={slots}
              timezone={me.timezone}
              participants={participants}
              mySlots={mySlots}
              allAvailability={availabilityByParticipant}
              onChange={toggleSlots}
              disabled={iAmPublished}
            />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
              {iAmPublished ? (
                <>
                  <p className="text-sm text-[var(--ink)]">
                    Publicaste{" "}
                    <strong className="font-semibold text-[var(--gold)]">
                      {mySlots.size}
                    </strong>{" "}
                    bloques. Esperando al resto.
                  </p>
                  <button onClick={unpublish} className="btn-ghost">
                    Editar mis horarios
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-[var(--ink-soft)]">
                    {mySlots.size === 0
                      ? "Haz clic y arrastra para pintar bloques."
                      : `Marcaste ${mySlots.size} bloque${
                          mySlots.size === 1 ? "" : "s"
                        }.`}
                  </p>
                  <button
                    onClick={publish}
                    disabled={publishing || mySlots.size === 0}
                    className="btn-primary"
                  >
                    {publishing ? "Publicando..." : "Publicar"}
                  </button>
                </>
              )}
            </div>
          </section>

          <aside className="space-y-8">
            <ParticipantsList participants={participants} meId={me.id} />
            {allPublished ? (
              <BestSlots
                blocks={bestBlocks}
                totalParticipants={publishedParticipants.length}
                timezone={me.timezone}
              />
            ) : (
              <div className="border-l-2 border-[var(--gold)] pl-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--ink-faint)]">
                  Pendiente
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
                  El horario en común aparece cuando{" "}
                  <em className="font-display italic text-[var(--gold)]">
                    todos
                  </em>{" "}
                  publican sus bloques.
                </p>
              </div>
            )}
          </aside>
        </div>
        </div>
      )}
    </div>
  );
}

function JoinForm({
  onJoin,
  error,
}: {
  onJoin: (name: string, tz: string) => void;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [tz, setTz] = useState("UTC");

  useEffect(() => {
    // detectTimezone usa Intl en cliente; no puede ejecutarse durante SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTz(detectTimezone());
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onJoin(name, tz);
      }}
      className="mx-auto max-w-md border border-[var(--line)] bg-[var(--bg-card)] p-8"
    >
      <h2 className="font-display text-2xl text-[var(--gold)]">Únete al grupo</h2>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        Tu nombre y tu zona horaria, nada más.
      </p>
      <div className="mt-7 space-y-6">
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-faint)]">
            Tu nombre
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            required
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--ink-faint)]">
            Tu zona horaria
          </span>
          <select
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className="input appearance-none"
          >
            {!COMMON_TIMEZONES.includes(tz) && (
              <option value={tz}>{tz} (detectada)</option>
            )}
            {COMMON_TIMEZONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <div className="border-l-2 border-[var(--gold)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--ink)]">
            {error}
          </div>
        )}
        <button type="submit" className="btn-primary w-full">
          Entrar →
        </button>
      </div>
    </form>
  );
}

function ParticipantsList({
  participants,
  meId,
}: {
  participants: ParticipantRow[];
  meId: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--ink-faint)]">
        Participantes
      </p>
      <ul className="mt-3 divide-y divide-[var(--line-soft)] border-t border-[var(--line-soft)]">
        {participants.map((p, i) => {
          const published = p.published_at != null;
          return (
            <li
              key={p.id}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="inline-flex items-center gap-2 text-[var(--ink)]">
                <span
                  className="inline-block h-3 w-3 border border-[var(--line)]"
                  style={{ backgroundColor: participantColor(i) }}
                  aria-hidden="true"
                />
                {p.name}
                {p.id === meId && (
                  <span className="ml-1 text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                    (tú)
                  </span>
                )}
              </span>
              <span
                className={`text-[10px] uppercase tracking-wider ${
                  published ? "text-[var(--gold)]" : "text-[var(--ink-faint)]"
                }`}
              >
                {published ? "Publicó" : "Pendiente"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
