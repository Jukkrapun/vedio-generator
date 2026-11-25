import { listCharacters } from "@/lib/characters";
import { CharacterList } from "@/components/characters";

export const metadata = { title: "ตัวละคร" };
export const dynamic = "force-dynamic";
export default async function CharactersPage() {
  return <CharacterList items={await listCharacters()} />;
}
