const timezone = "Asia/Bangkok";
export function thaiDate(date: string) {
  const value = new Date(date + "T12:00:00+07:00");
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("th-TH", { timeZone: timezone, ...options }).format(value);
  return format({ weekday: "long" }) + " " + format({ day: "numeric", month: "short", year: "numeric" });
}
export function thaiShortDate(date: string) {
  return new Intl.DateTimeFormat("th-TH", { timeZone: timezone, day: "numeric", month: "short" }).format(new Date(date + "T12:00:00+07:00"));
}
export function duration(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  const seconds = Math.max(0, Math.floor((Date.parse(end) - Date.parse(start)) / 1000));
  return seconds < 60 ? seconds + " วิ" : Math.floor(seconds / 60) + " นาที " + seconds % 60 + " วิ";
}
