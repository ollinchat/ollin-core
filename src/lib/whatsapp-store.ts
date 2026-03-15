/**
 * WhatsApp message persistence. Uses Supabase app_state when available;
 * otherwise in-memory (same process only). Key: whatsapp_messages.
 */

export type StoredWaMessage = {
  id: string;
  phone: string;
  from_me: boolean;
  text: string;
  timestamp_ms: number;
  type: "text" | "image" | "audio" | "document" | "video";
  media_url?: string;
};

const STORAGE_KEY = "whatsapp_messages";

let memoryStore: StoredWaMessage[] = [];

type SupabaseClientLike = {
  from: (table: string) => {
    select: (cols: string) => { eq: (col: string, val: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> } } };
    upsert: (row: unknown, opts: { onConflict: string }) => Promise<unknown>;
  };
};

async function getSupabase(): Promise<SupabaseClientLike | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, key) as unknown as SupabaseClientLike;
  } catch {
    return null;
  }
}

const DEFAULT_USER_ID = "default";
const APP_STATE_TABLE = "app_state";

export async function loadWaMessages(): Promise<StoredWaMessage[]> {
  const supabase = await getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(APP_STATE_TABLE)
        .select("value")
        .eq("id", DEFAULT_USER_ID)
        .eq("key", STORAGE_KEY)
        .maybeSingle();
      if (!error && data && typeof (data as { value: StoredWaMessage[] }).value === "object") {
        const arr = (data as { value: StoredWaMessage[] }).value;
        return Array.isArray(arr) ? arr : [];
      }
    } catch (_) {}
  }
  return memoryStore;
}

export async function saveWaMessages(messages: StoredWaMessage[]): Promise<void> {
  const supabase = await getSupabase();
  memoryStore = messages;
  if (supabase) {
    try {
      await supabase.from(APP_STATE_TABLE).upsert(
        {
          id: DEFAULT_USER_ID,
          key: STORAGE_KEY,
          value: messages,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id,key" }
      );
    } catch (_) {}
  }
}

export async function appendWaMessage(msg: StoredWaMessage): Promise<void> {
  const list = await loadWaMessages();
  list.push(msg);
  await saveWaMessages(list);
}

export async function getMessagesByPhone(phone: string): Promise<StoredWaMessage[]> {
  const normalized = phone.replace(/\D/g, "");
  if (!normalized) return [];
  const list = await loadWaMessages();
  return list
    .filter((m) => m.phone.replace(/\D/g, "") === normalized)
    .sort((a, b) => a.timestamp_ms - b.timestamp_ms);
}
