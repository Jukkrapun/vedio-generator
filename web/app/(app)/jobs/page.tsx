import { getSeries } from "@/lib/data";
import { JobsScreen } from "@/components/jobs";
export const metadata = { title: "สร้างตอนและงานผลิต" };
export default async function JobsPage() { return <JobsScreen series={await getSeries()} />; }
