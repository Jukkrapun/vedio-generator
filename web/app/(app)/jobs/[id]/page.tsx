import { getJob } from "@/lib/data";
import { JobScreen } from "@/components/jobs";
export const metadata = { title: "รายละเอียดงาน" };
export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobScreen id={id} initial={await getJob(id)} />;
}
