import { handle } from "@/lib/api";
import { changePosts, createJob, selectedVersionOf, VERSION_RE, type PostOp } from "@/lib/repo";
import { platforms, type Post } from "@/lib/types";

type Params = { params: Promise<{ series: string; slug: string }> };
const num = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));

function cleanPost(input: Partial<Post>): Post {
  if (!platforms.includes(input.platform as Post["platform"])) throw new Error("bad platform");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date))) throw new Error("bad date");
  if (!/^\d{2}:\d{2}$/.test(String(input.time))) throw new Error("bad time");
  const url = String(input.url ?? "").trim();
  // the post link is the proof that the clip was really posted
  if (!/^https?:\/\/\S+\.\S+/i.test(url)) throw new Error("ต้องใส่ลิงก์โพสต์");
  return { platform: input.platform!, date: input.date!, time: input.time!, url, views: num(input.views), likes: num(input.likes), saves: num(input.saves), source: "web" };
}

/** Body: {op:"add",post} | {op:"remove",index} | {op:"update",index,stats}. Queues a catalog refresh. */
export const POST = (request: Request, { params }: Params) => handle(async () => {
  const { series, slug } = await params;
  const body = await request.json();
  let op: PostOp;
  if (body.op === "add") {
    const post = cleanPost(body.post ?? {});
    // record which take was posted: the one sent by the client, else the currently chosen one
    const version = VERSION_RE.test(String(body.post?.version ?? "")) ? String(body.post.version) : await selectedVersionOf(series, slug);
    op = { op: "add", post: version ? { ...post, version } : post };
  }
  else if (body.op === "remove") op = { op: "remove", index: Number(body.index) };
  else if (body.op === "update") {
    const s = body.stats ?? {};
    op = { op: "update", index: Number(body.index), stats: { views: num(s.views), likes: num(s.likes), saves: num(s.saves) } };
  } else throw new Error("bad op");
  const posts = await changePosts(series, slug, op);
  await createJob("catalog", { series });
  return { posts };
});
