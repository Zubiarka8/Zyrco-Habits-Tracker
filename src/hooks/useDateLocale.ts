import { useTranslation } from "react-i18next";
import { es } from "date-fns/locale/es";
import type { Locale } from "date-fns";

/** Returns the date-fns Locale matching the current app language. */
export function useDateLocale(): Locale | undefined {
  const { i18n } = useTranslation();
  return i18n.language.startsWith("es") ? es : undefined;
}
