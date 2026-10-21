import dayjs, { type Dayjs } from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import "dayjs/locale/ja";

dayjs.extend(advancedFormat);

/** Shared list formatting owns its plugins instead of depending on another route's imports. */
export function formatTreatmentDate(
  value: Date | Dayjs,
  locale: string,
  reference: Date = new Date(),
): string {
  const date = dayjs(value).locale(locale),
    now = dayjs(reference);
  if (date.isSame(now, "day")) return date.format("HH:mm");
  if (now.diff(date, "days") < 7)
    return date.format(locale === "ja" ? "M月D日 (ddd)" : "ddd Do");
  if (date.year() === now.year())
    return date.format(locale === "ja" ? "M月D日" : "D MMM");
  return date.toDate().toLocaleDateString(locale);
}
