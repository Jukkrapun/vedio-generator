# AI production pipelines for 3D cartoon characters (vertical shorts)

Research scope was limited: 4 web searches, all returning aggregator or vendor summaries. Treat the numbers as indicative and check the official rate cards before spending money.

## Image route (GPT-image / Midjourney / Flux-SDXL), prompt vocabulary, consistency

### Takeaway
This is the cheapest route and fits the repo's existing tooling: Codex images plus `image_refs` character sheets, which `poc/cat-2am` already uses. Describe the look with generic rendering terms rather than studio names.

### Cited Findings
- No sourced prompt guide was found this round. The repo already supports reference sheets via `image_refs` and custom `image_rules` in `tools/images.py` (CLAUDE.md, poc/cat-2am).

### Inferences
- These are generic, trademark-free terms to try: "stylized 3D cartoon render, soft subsurface scattering skin, clay-like materials, rounded proportions, big expressive eyes, soft global illumination, rim light, shallow depth of field, octane/cycles-style render". Use "animated feature film look" rather than naming Pixar or Disney.
- For consistency, generate one turnaround sheet first (front, 3/4 and side views plus expressions) and attach it to every Codex run.

### Gaps
- Midjourney v7 `--cref`/`--oref` behaviour and current Flux/SDXL 3D LoRA names were not verified.

## Real 3D route (image-to-3D, rigging, Blender, 3D lip-sync)

### Takeaway
Tripo, Meshy, Rodin, Hunyuan3D and TRELLIS.2 all turn a single image into a mesh within seconds to minutes. Rankings disagree and most come from vendors.

### Cited Findings
- A June 2026 Medium review ranks Tripo first, then Meshy, Rodin, Hunyuan3D and TRELLIS.2, and calls Tripo strongest on detail and API access — [Medium](https://medium.com/ideas-with-wings/best-ai-3d-model-generators-in-2026-tripo-ai-vs-meshy-rodin-kaedim-and-more-7eea7b05eb11)
- Meshy says Meshy 6 won a 63.8% preference rate against Tripo in a benchmark. This is a vendor claim. Meshy lists TRELLIS 2, Hunyuan3D and TripoSR as open-source self-host options — [Meshy compare](https://www.meshy.ai/de/compare)
- 3D AI Studio, a reseller, rates Hunyuan3D 4.5/5 among the open models, says it is not available in the EU, rates TRELLIS-2 3/5, and gives speeds of ~3 s (TRELLIS-2) and 10–25 s (Hunyuan3D) — [3D AI Studio](https://www.3daistudio.com/3d-generator-ai-comparison-alternatives-guide/best-image-to-3d-tools-2026)
- Scenario says Tripo 2.5 retires on 2026-12-01 in favour of Tripo 3.1. It lists Meshy 7.1 with higher-resolution PBR texturing and a multi-view (up to 4 angles) Hunyuan variant — [Scenario](https://help.scenario.com/en/articles/comparing-generative-3d-models/)

### Inferences
- On the CPU-only PC, use the hosted Tripo or Meshy services, or run Hunyuan3D or TRELLIS on a rented vast.ai GPU.
- After generating the mesh, the next steps would be:
  - rig it automatically with Mixamo or AccuRIG
  - render it in Blender EEVEE, which also works on CPU, but slowly
  - drive lip-sync with Rhubarb Lip Sync (offline, CPU, outputs mouth shapes) or with ARKit/VRM blendshapes
- The repo already has a VRoid/VRM lip-sync POC in `content/poc/hyperframes/`. This route has the highest effort, but it gives fully consistent faces at zero cost per clip after setup.

### Gaps
- Rigging, Rhubarb, Audio2Face and VRoid were not checked against sources this round. Generated meshes usually need cleanup before rigging, but I have no source for that.

## Video route (Kling, Veo, Hailuo, Seedance, Runway) and talking tools (Hedra)

### Takeaway
Image-to-video costs roughly $0.02–0.13 per second at official rates, and Veo full is the most expensive. Hedra Character-3 lip-syncs a still image for 2.5–6.25¢ per second.

### Cited Findings
- Using official rates only, invideo lists:
  - Kling 3.0 Turbo at ~¥0.8/s (~$0.11) at 720p
  - Hailuo MiniMax-H3 at $0.13/s at 2K
  - Seedance at ~$0.022/s (estimate; Seedance is billed by token)

  It warns that resellers often charge 2–3× more — [invideo](https://invideo.io/blog/ai-video-model-pricing)
- CometAPI lists Veo 3.1 Lite at $0.03/s (720p) and Kling 3.0 from $0.112/s at 1080p — [CometAPI](https://www.cometapi.com/ai-video-api-pricing/)
- Full Veo 3.1 costs ~$0.75/s according to an April 2026 guide — [Flik AI](https://www.flikai.com/blog/ai-video-pricing-2026)
- Seedance 2.0 Mini costs ~$0.073/s and 2.0 Fast ~$0.09/s at 720p — [devtk](https://devtk.ai/en/blog/ai-video-generation-pricing-2026/); [Techsy](https://techsy.io/en/blog/best-ai-video-providers)
- Hedra Character-3 API pricing is 2.5¢/s at 540p, 5¢/s at 720p and 6.25¢/s at 1080p. It is built for image-to-video lip-sync — [Hedra](https://www.hedra.com/video-models/hedra-character-3/avatar)
- Hedra plan prices quoted by third parties range from $20 to $100 a month, and they conflict — [fluxnote](https://fluxnote.io/guides/hedra-ai-review)

### Inferences
- A 20 s clip would cost about $0.5–2.5 per take, and real use needs several takes. That is far above the current image-mode cost (~$0).
- A 20 s Hedra clip at 720p costs about $1. That suggests Hedra as a cheap POC for a lip-synced 3D cartoon host, an alternative to the paused MuseTalk/InfiniteTalk work.
- Stylized 3D faces probably hold their identity better than photoreal faces in these models, but no benchmark was found for this.

### Gaps
- No source compared face consistency for 3D cartoon inputs. Runway pricing and Kling's lip-sync feature were not checked.

## 2.5D parallax on 3D cartoon renders

### Takeaway
I found no external source. On reasoning alone, 3D-style renders should give the depth model clearer cues than flat 2D art.

### Inferences
- 3D renders have real shading, depth of field and occlusion, so Depth Anything V2 should separate the layers better than it does on flat cel art. This is worth an A/B test on a single image with `tools/parallax.py` (cat-2am 2D results are the baseline).

### Gaps
- No benchmark or tutorial on this was found.

## Legal: trademarks, style imitation, AI labels

### Takeaway
Copyright doesn't protect a style. Studio names are still risky in prompts, titles and marketing, and output made purely from prompts is not copyrightable.

### Cited Findings
- The US Copyright Office says copyright covers only human-created material. Prompting alone has not qualified, and a creative prompt doesn't make the output copyrightable — [Fish & Richardson](https://www.fr.com/news-insights/articles/us-copyright-office-cancels-registration-for-ai-generated-art-issues-ai-related-registration-guidance/); [NYSBA](https://nysba.org/assessing-human-authorship-in-ai-generated-works/)
- Whether AI should be allowed to imitate artists' styles is still debated, and no official ruling says a style is protectable — [Brookings](https://www.brookings.edu/articles/ai-and-the-visual-arts/)

### Inferences
- Don't use "Pixar" or "Disney" in prompts, titles, hashtags or descriptions, and don't copy their actual characters. Keep the existing practice of ticking each platform's AI-generated label (CLAUDE.md).
- The channel cannot rely on copyright to stop others copying a purely AI-generated character.

### Gaps
- I found no source on Pixar or Disney trademark or trade-dress enforcement against "in the style of" content, and no Thai-law source. Current TikTok, YouTube and Meta AI-label policy pages were not fetched this round.
