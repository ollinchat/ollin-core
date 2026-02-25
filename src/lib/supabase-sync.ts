/**
 * Optional sync layer: when Supabase credentials and package are available,
 * persist and load Board, Profile, Scans, TimeClock to/from the remote DB.
 * Otherwise no-op / return null; app uses localStorage only.
 */

import { getSupabaseClientAsync, SUPABASE_APP_STATE_TABLE } from "./supabase";
import type { BoardTask, MeetingOrEvent } from "./board-types";
import type { Profile } from "./profile-types";
import type { ScannedDoc } from "./finance-types";
import type { TimeClockEntry } from "./timeclock-types";

const DEFAULT_USER_ID = "default";

type SupabaseClientLike = {
  from: (table: string) => {
    select: (cols: string) => { eq: (col: string, val: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> } } };
    upsert: (row: unknown, opts: { onConflict: string }) => Promise<unknown>;
  };
};

export type BoardPayload = {
  given: BoardTask[];
  received: BoardTask[];
  meetings: MeetingOrEvent[];
  events: MeetingOrEvent[];
};

export async function loadBoardFromSupabase(): Promise<BoardPayload | null> {
  const supabase = (await getSupabaseClientAsync()) as SupabaseClientLike | null;
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(SUPABASE_APP_STATE_TABLE)
      .select("value")
      .eq("id", DEFAULT_USER_ID)
      .eq("key", "board")
      .maybeSingle();
    if (error || !data) return null;
    return (data as { value: BoardPayload }).value;
  } catch {
    return null;
  }
}

export async function saveBoardToSupabase(payload: BoardPayload): Promise<void> {
  const supabase = (await getSupabaseClientAsync()) as SupabaseClientLike | null;
  if (!supabase) return;
  try {
    await supabase.from(SUPABASE_APP_STATE_TABLE).upsert(
      {
        id: DEFAULT_USER_ID,
        key: "board",
        value: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id,key" }
    );
  } catch (_) {}
}

export async function loadProfileFromSupabase(): Promise<Profile | null> {
  const supabase = (await getSupabaseClientAsync()) as SupabaseClientLike | null;
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(SUPABASE_APP_STATE_TABLE)
      .select("value")
      .eq("id", DEFAULT_USER_ID)
      .eq("key", "profile")
      .maybeSingle();
    if (error || !data) return null;
    return (data as { value: Profile }).value;
  } catch {
    return null;
  }
}

export async function saveProfileToSupabase(profile: Profile): Promise<void> {
  const supabase = (await getSupabaseClientAsync()) as SupabaseClientLike | null;
  if (!supabase) return;
  try {
    await supabase.from(SUPABASE_APP_STATE_TABLE).upsert(
      {
        id: DEFAULT_USER_ID,
        key: "profile",
        value: profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id,key" }
    );
  } catch (_) {}
}

export async function loadScansFromSupabase(): Promise<ScannedDoc[] | null> {
  const supabase = (await getSupabaseClientAsync()) as SupabaseClientLike | null;
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(SUPABASE_APP_STATE_TABLE)
      .select("value")
      .eq("id", DEFAULT_USER_ID)
      .eq("key", "scans")
      .maybeSingle();
    if (error || !data) return null;
    return (data as { value: ScannedDoc[] }).value;
  } catch {
    return null;
  }
}

export async function saveScansToSupabase(docs: ScannedDoc[]): Promise<void> {
  const supabase = (await getSupabaseClientAsync()) as SupabaseClientLike | null;
  if (!supabase) return;
  try {
    await supabase.from(SUPABASE_APP_STATE_TABLE).upsert(
      {
        id: DEFAULT_USER_ID,
        key: "scans",
        value: docs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id,key" }
    );
  } catch (_) {}
}

export async function loadTimeClockFromSupabase(): Promise<TimeClockEntry[] | null> {
  const supabase = (await getSupabaseClientAsync()) as SupabaseClientLike | null;
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(SUPABASE_APP_STATE_TABLE)
      .select("value")
      .eq("id", DEFAULT_USER_ID)
      .eq("key", "timeclock")
      .maybeSingle();
    if (error || !data) return null;
    return (data as { value: TimeClockEntry[] }).value;
  } catch {
    return null;
  }
}

export async function saveTimeClockToSupabase(entries: TimeClockEntry[]): Promise<void> {
  const supabase = (await getSupabaseClientAsync()) as SupabaseClientLike | null;
  if (!supabase) return;
  try {
    await supabase.from(SUPABASE_APP_STATE_TABLE).upsert(
      {
        id: DEFAULT_USER_ID,
        key: "timeclock",
        value: entries,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id,key" }
    );
  } catch (_) {}
}
