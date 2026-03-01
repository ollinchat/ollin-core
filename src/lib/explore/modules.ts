/**
 * Self-building core: plug-and-play module registry for Explore.
 * Every new feature can register here so the AI can expand the system autonomously later.
 * Usage: registerExploreModule({ id, name, component? }); render via getExploreModules().
 */

import type { ReactNode } from "react";

export type ExploreModuleEntry = {
  id: string;
  name: string;
  /** Optional slot: "header" | "above_feed" | "below_feed" | "dev_panel" */
  slot?: string;
  component?: ReactNode;
  /** Called when the module is mounted (e.g. to log or init). */
  onMount?: () => void;
};

const registry: ExploreModuleEntry[] = [];

export function registerExploreModule(entry: ExploreModuleEntry): void {
  if (!registry.some((m) => m.id === entry.id)) {
    registry.push(entry);
  }
}

export function getExploreModules(slot?: string): ExploreModuleEntry[] {
  if (slot) return registry.filter((m) => m.slot === slot);
  return [...registry];
}

export function clearExploreModules(): void {
  registry.length = 0;
}
