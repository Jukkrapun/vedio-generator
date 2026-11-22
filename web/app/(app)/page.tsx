import { getPublishFields, getToday } from "@/lib/data";
import { TodayScreen } from "@/components/today";
export default async function TodayPage() {
  const [today, fields] = await Promise.all([getToday(), getPublishFields()]);
  return <TodayScreen initial={today} fields={fields} />;
}
