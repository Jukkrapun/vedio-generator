import Link from "next/link";
import { Empty } from "@/components/common";
import { ReviewScreen } from "@/components/pipeline";
import { getEpisodeDetail } from "@/lib/repo";

export const metadata = { title: "ตรวจงาน" };
export const dynamic = "force-dynamic";
export default async function ReviewPage({ params }: { params: Promise<{ series: string; slug: string }> }) {
  const { series, slug } = await params;
  const detail = await getEpisodeDetail(series, slug);
  if (!detail) return <><Link className="back-link" href="/jobs">งานทั้งหมด</Link><Empty>ไม่พบตอนนี้</Empty></>;
  return <ReviewScreen key={detail.id} id={detail.id} initial={detail} />;
}
