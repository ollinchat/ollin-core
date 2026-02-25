"use client";

import { forwardRef } from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", fullWidth, children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none min-h-[48px] px-6 py-3 active:scale-[0.98]";
    const variants = {
      primary: "bg-gradient-to-r from-accent-emerald to-accent text-white shadow-soft hover:shadow-glow-subtle",
      secondary: "bg-accent-muted/80 text-gray-800 hover:bg-accent-muted shadow-soft",
      ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
    };
    return (
      <button
        ref={ref}
        type="button"
        className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
