export type Locale = "en" | "he";

export const locales: Locale[] = ["en", "he"];
export const defaultLocale: Locale = "en";

export const rtlLocales: Locale[] = ["he"];

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

export function getDir(locale: Locale): "ltr" | "rtl" {
  return isRtl(locale) ? "rtl" : "ltr";
}
