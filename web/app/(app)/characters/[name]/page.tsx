import { notFound } from "next/navigation";
import { getCharacter } from "@/lib/characters";
import { CharacterDetail } from "@/components/characters";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  return { title: "ตัวละคร · " + (await params).name };
}
export default async function CharacterPage({ params }: { params: Promise<{ name: string }> }) {
  const item = await getCharacter((await params).name);
  if (!item) notFound();
  return <CharacterDetail item={item} />;
}
