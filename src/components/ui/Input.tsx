"use client";

import { forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
>(({ className = "", label, error, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-600">{label}</label>
      )}
      <input
        ref={ref}
        className={`w-full rounded-2xl border-0 bg-white shadow-soft px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-accent/30 min-h-[48px] ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
});
Input.displayName = "Input";
