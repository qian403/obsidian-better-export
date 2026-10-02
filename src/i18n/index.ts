import en from "./en";
import zh from "./zh";
import zhTW from "./zh-TW";
import type { Lang } from "./en-type";
export type { Lang } from "./en-type";

export const locales = { en, zh, "zh-TW": zhTW } satisfies Record<string, Lang>;
export type Locale = keyof typeof locales;
export type LanguageSetting = Locale | "auto";
export const languageNames: Record<Locale, string> = {
  en: "English",
  zh: "简体中文",
  "zh-TW": "繁體中文",
};

/** Accept Obsidian language codes and common BCP 47 region/script aliases. */
export function resolveLocale(language?: string | null): Locale {
  const code = language?.trim().replace(/_/g, "-").toLowerCase() ?? "";
  if (code === "zh") return "zh";
  if (code.startsWith("zh-")) {
    const parts = code.split("-");
    if (parts.includes("hant")) return "zh-TW";
    if (parts.includes("hans")) return "zh";
    if (parts.some((part) => ["tw", "hk", "mo"].includes(part))) return "zh-TW";
    return "zh";
  }
  return "en";
}

export function isLanguageSetting(value: unknown): value is LanguageSetting {
  return value === "auto" || (typeof value === "string" && Object.prototype.hasOwnProperty.call(locales, value));
}

/** Dictionaries are built once, avoiding deep merges every time a dialog opens. */
export function getTranslations(language: LanguageSetting = "auto", appLanguage?: string | null): Lang {
  return locales[resolveLocale(language === "auto" ? appLanguage : language)] ?? en;
}

export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : placeholder,
  );
}

export function errorMessage(error: unknown, strings: Lang): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === "string" && Object.prototype.hasOwnProperty.call(strings.notices, code)) {
    return strings.notices[code as keyof Lang["notices"]];
  }
  return error instanceof Error ? error.message : String(error);
}
