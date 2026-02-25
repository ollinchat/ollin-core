"use client";

import { useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";

export function SetDir() {
  const { dir, locale } = useLocale();
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);
  return null;
}
