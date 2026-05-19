import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
    );
  }
  _client = createClient(url, anonKey);
  return _client;
}

// Proxy que difiere la inicialización hasta el primer acceso
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type EventRow = {
  id: string;
  title: string;
  organizer_name: string;
  organizer_timezone: string;
  week_anchor: string; // YYYY-MM-DD del lunes ancla
  day_start_hour: number;
  day_end_hour: number;
  created_at: string;
};

export type ParticipantRow = {
  id: string;
  event_id: string;
  name: string;
  timezone: string;
  published_at: string | null;
  created_at: string;
};

export type AvailabilityRow = {
  participant_id: string;
  slot_start: string;
};
