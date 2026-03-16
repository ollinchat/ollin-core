"use client";

import type { ReactNode } from "react";

/**
 * Simple panel layout: optional header/footer, scrollable middle.
 * Use fillParent when inside a flex container (e.g. dashboard) so scroll works; otherwise h-screen.
 */
export type PanelWrapperProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  /** When true, use flex-1 min-h-0 instead of h-screen so the panel fills and scrolls inside parent. */
  fillParent?: boolean;
};

export function PanelWrapper({
  header,
  footer,
  children,
  className,
  fillParent,
}: PanelWrapperProps) {
  const base = fillParent ? "flex flex-col flex-1 min-h-0" : "flex flex-col h-screen";
  return (
    <div className={className ? `${base} ${className}` : base}>
      {header != null && (
        <div className="flex-shrink-0" data-panel-header>
          {header}
        </div>
      )}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {children}
      </div>
      {footer != null && (
        <div className="flex-shrink-0 relative z-[100]" data-panel-footer>
          {footer}
        </div>
      )}
    </div>
  );
}
