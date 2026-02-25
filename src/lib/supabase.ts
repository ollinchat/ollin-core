/**
 * Optional Supabase client. Uses dynamic import so the app builds and runs
 * without @supabase/supabase-js installed. When env vars are set and the
 * package is available, returns a client; otherwise null.
 */

export const SUPABASE_APP_STATE_TABLE = "app_state";

export type AppStateRow = {
  id: string;
  key: "board" | "profile" | "scans";
  value: unknown;
  updated_at?: string;
};

let client: unknown = null;

export async function getSupabaseClientAsync(): Promise<unknown> {
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (client) return client;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    client = createClient(url, key);
    return client;
  } catch {
    return null;
  }
}
