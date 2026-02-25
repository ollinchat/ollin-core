export type ClockType = "in" | "out";

export interface TimeClockEntry {
  id: string;
  type: ClockType;
  timestamp: number;
  lat: number | null;
  lng: number | null;
  label?: string; // e.g. "Office" or mocked "Tel Aviv"
  note?: string; // optional note for the shift
  boardId?: string; // e.g. "board1" (Main Warehouse) for filtering logs
}
