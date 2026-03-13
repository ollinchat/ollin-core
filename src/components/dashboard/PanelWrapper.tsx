"use client";

import type { ReactNode } from "react";

/**
 * Simple panel layout: optional header/footer, scrollable middle.
 * Standard web: flex flex-col h-screen, no safe-area hacks.
 */
export type PanelWrapperProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PanelWrapper({
  header,
  footer,
  children,
  className,
}: PanelWrapperProps) {
  return (
    <div className={className ? `flex flex-col h-screen ${className}` : "flex flex-col h-screen"}>
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
