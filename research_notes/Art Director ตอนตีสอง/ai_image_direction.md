# Art Direction for AI-Generated Imagery (ตอนตีสอง pipeline: Codex/GPT-image, 9:16, parallax, cartoon series with image_refs)

## Best practices for consistent characters and style across many images

### Takeaway
Reference images beat long text descriptions, so attach a fixed, named character sheet to every generation. Repeat the defining traits word for word, and add an explicit "do not redesign" constraint. Seeds aren't exposed in the Codex/GPT-image workflow, so consistency comes from references plus a locked text block.

### Cited Findings
- OpenAI says to build a reusable character reference with defining details (outfit, proportions, facial features, tone). Later scenes can change the setting and story, but the prompt must repeat those details and add a constraint such as "Do not redesign the character" to reduce drift. — [OpenAI Cookbook: GPT Image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
- OpenAI says to label each input image by number and role (subject, style, clothing, background) and state how the inputs combine. For style transfer, describe the new subject separately from the reference's palette, texture or medium. — [OpenAI Cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
- OpenAI on iteration: pass the previous output back as input and ask for one change at a time. Repeat critical constraints, because "same style as before" may not hold. — [OpenAI Cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
- One secondary source reports that the GPT Image family accepts up to 16 reference images. — [fal.ai GPT Image 2 guide](https://fal.ai/learn/tools/prompting-gpt-image-2)
- A secondary summary says OpenAI recommends reusing a character reference and repeating appearance constraints, and that recurring characters drift between generations. — [Atlas Cloud](https://www.atlascloud.ai/blog/tips/gpt-image-2.6-consistent-character)
- Practitioners argue that named reference sheets built once and reattached to every generation beat longer descriptions. — [AI Meets Girlboss](https://aimeetsgirlboss.substack.com/cp/197554874)
- Front/side/back turnaround sheets are used to keep a character consistent across angles. — [Dreamina tutorial](https://dreamina.capcut.com/resource/gpt-image-2-for-character-turnaround-sheets)
- Other tool vendors (Runway, Replicate) also build character consistency around reference images. — [Runway](https://runwayml.com/resources/create-consistent-ai-characters); [Replicate](https://replicate.com/blog/generate-consistent-characters)

### Inferences
- The project's `image_refs` (character sheet attached to the Codex run) matches the recommended practice. Strengthen it in three ways: put a turnaround plus expression sheet for ส้มฉุน/ใบเตย in `shared/characters/<name>/reference/`, label each attached image's role inside the prompt ("Image 1 = character identity sheet; do not redesign"), and keep a fixed identity text block identical across episodes.
- Use a "style anchor" image (one approved frame per series) as a second reference to lock palette and rendering, not just identity.

### Gaps
- No official confirmation of seed control or exact reference-image limits through Codex CLI specifically.
- The 16-image limit comes from a secondary source only.

## How to structure a reusable prompt system (shared style block + per-shot block)

### Takeaway
Use labeled sections with a fixed series style block, a fixed character block, a per-shot block (scene, action, framing, emotion) and a fixed constraints and negatives block. Edits should say what changes and what must be preserved.

### Cited Findings
- OpenAI recommends labeled sections for complex prompts (scene, subject, details, constraints). Prose, labeled lists or JSON-like structures all work. It also says to state the intended use, composition, aspect ratio and placement constraints. — [OpenAI Cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
- Visible details matter: name materials, lighting, colors and medium. Camera and lens terms act as cues for appearance, not exact physical simulation. For people, specify framing, scale, gaze and how they interact with objects. — [OpenAI Cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
- fal.ai's template is Scene / Subject / Important details / Use case / Constraints, and it splits edits into a change step and a preserve step. — [fal.ai](https://fal.ai/learn/tools/prompting-gpt-image-2)
- For edits, OpenAI says to list what stays the same (identity, geometry, layout, lighting) and name exclusions such as unwanted text, logos or watermarks. For exact pixel preservation, composite the result instead of relying on the prompt. — [OpenAI Cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)

### Inferences
- Suggested template mapped to `episode.json`:
  - `image_style` = series style block: medium, palette (e.g. deep navy/teal shadows, one warm practical light such as a lamp, phone glow or streetlight), grain, lens feel.
  - Character block = from the persona/reference.
  - `image_prompt` = per-shot block: subject action, emotion, shot size, angle.
  - A shared constraints block: "vertical 9:16; keep the key subject in the center 60% (UI safe zones); clear foreground/midground/background separation for parallax; no text, logos, watermarks; do not redesign the character."
- Ask for depth layering explicitly, because the 2.5D parallax relies on a good depth map. Flat compositions or busy edges give weak or warped parallax.
- Keep a palette and lighting spec per series in `series.md` so the late-night tone stays consistent. Low-key lighting with one motivated warm source fits the brand.

### Gaps
- I found no source measuring whether JSON or prose prompts give more consistent results with GPT-image.

## Common AI-image artifacts and using a vision LLM as an AD reviewer

### Takeaway
Typical trust-killers are malformed hands and limbs, fused bodies, garbled or extra text, distortion and blur, and identity drift. Rubric-based VLM judges work for coarse checks such as text and structural failures, but they are measurably weaker than humans on anatomy, so keep a human final pass for hands and faces.

### Cited Findings
- MJ-Bench's image-quality rubric checks for distortion, blurriness, and illogical facial features, limbs, fingers, objects or text. — [MJ-Bench, arXiv 2407.04842](https://arxiv.org/pdf/2407.04842)
- MagicMirror builds a taxonomy of generated-image artifacts with a 340K human-annotated dataset, and notes that anatomically correct hands are scarce in the data and hard to learn. — [arXiv 2509.10260](https://arxiv.org/pdf/2509.10260v1)
- Human vs multimodal-LLM comparison: some attributes, such as anatomical accuracy, are much harder for MLLMs to judge. — [What Makes a Good Generated Image?, arXiv 2509.12750](https://arxiv.org/html/2509.12750v1)
- Text rubric practice: the judge OCRs the text and flags misspellings, missing characters and cropping. — [arXiv 2510.15021](https://arxiv.org/pdf/2510.15021)
- A strict structural judge prompt fails an image on any structural issue, including malformed hands and feet or fused bodies. — [arXiv 2607.29679](https://arxiv.org/pdf/2607.29679)
- Reliability practice: treat judge parse failures as missing data, not zeros. — [UltraText Bench, arXiv 2610.09823](https://arxiv.org/pdf/2610.09823)
- OpenAI says outputs must be verified: check every word and number, because the model may add elements you didn't request. — [OpenAI Cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
- Automatic quality assessment of generated images is studied for cost savings. — [arXiv 2510.16179](https://arxiv.org/html/2510.16179v1)

### Inferences
- A practical AD-review rubric for the web review stage (`/review/<series>/<slug>`, images step) could score each item pass/warn/fail and give a fix:
  1. Identity match vs reference sheet (face, outfit, colors).
  2. Style match vs series anchor (palette, lighting, medium).
  3. Anatomy (hands, limbs, eyes).
  4. Stray text, logos or watermarks (should be none).
  5. Composition for 9:16 and safe zones, with the subject clear of the caption area.
  6. Depth separation for parallax.
  7. Fits the segment's emotion and line.
  8. "AI look" cues: plastic skin, over-saturation, everything sharp, symmetrical stock composition.
- Run the judge with the reference images attached and ask for strict JSON. Auto-regenerate on hard fails (text, structural), but route anatomy and identity to the human.
- To reduce the "AI look": film grain, imperfect motivated lighting, shallow depth of field, muted grading, natural asymmetry, ordinary props. These are practitioner heuristics; I found no measured source for them.

### Gaps
- No rigorous source was found on viewer trust impact of specific artifacts on TikTok/Reels.
- "Avoid AI look" guidance is mostly anecdotal; not sourced here.

## Disclosure/labeling norms for AI imagery on TikTok/YouTube/Meta (2026)

### Takeaway
All three platforms require labels for realistic AI content. Clearly unrealistic content, such as a 2D cartoon cat, is mostly exempt on YouTube. Platforms also auto-detect C2PA metadata, and GPT-image output carries it, so a label may be applied automatically and can't always be removed. Ticking the label every time, as the project already does, is the safe default, and an AI voiceover adds to the reasons to label.

### Cited Findings
- TikTok encourages labeling of content that is fully generated or significantly edited by AI, and requires labeling of realistic AI images, audio and video. — [TikTok Support](https://support.tiktok.com/en/using-tiktok/creating-videos/ai-generated-content)
- TikTok auto-labels via C2PA Content Credentials, for example content from OpenAI's DALL·E 3. — [TechCrunch 2024](https://techcrunch.com/2024/05/09/tiktok-automatically-label-ai-generated-content-created-other-platforms)
- TikTok newsroom, March 2026: testing invisible watermarking to bolster AI labels. — [TikTok Newsroom](https://newsroom.tiktok.com/tiktok-ssa-shares-more-ways-to-spot-shape-and-understand-ai-generated-content?lang=en-ZA)
- TikTok ads: mandatory AI disclosure labels in ads from July 21, 2026, a secondary source not verified on TikTok's own ad policy page. — [Common Thread Collective](https://commonthreadco.com/blogs/coachs-corner/tiktok-ai-ad-disclosure-rules-ecommerce-2026)
- A July 2026 Tubefilter report says TikTok's AI labels may not be effective, and TikTok is educating users. — [Tubefilter](https://www.tubefilter.com/2026/07/14/tiktok-ai-transparency-tools-content-labels/)
- YouTube requires disclosure of realistic altered or synthetic content; unrealistic content and minor edits are exempt. The disclosure is set in the upload flow ("Altered content"). YouTube may label content itself, with more prominent labels on sensitive topics. Disclosing does not limit reach or monetization. — [YouTube Help](https://support.google.com/youtube/answer/14328491); [YouTube Blog, Mar 2024](https://blog.youtube/news-and-events/disclosing-ai-generated-content)
- Meta shows an "AI info" label. A label may be required for photorealistic video or realistic audio created or altered with AI, and Meta's example includes a reel with a realistic AI voiceover. Meta auto-labels on industry-standard signals, and penalties can apply when a required label is missing. Content only edited by AI gets the label in the post menu. — [Meta Help](https://www.meta.com/help/artificial-intelligence/1783222608822690/); [Meta Transparency](https://transparency.meta.com/governance/tracking-impact/labeling-ai-content); [Meta Newsroom 2024](https://about.fb.com/news/2024/04/metas-approach-to-labeling-ai-generated-content-and-manipulated-media/)
- Meta is extending "AI info" to ads made with third-party AI tools, an update dated June 2026 per search summary. — [Meta Newsroom](https://about.fb.com/news/2025/02/gen-ai-transparency-metas-ads-products/)

### Inferences
- The photorealistic ใบเตย clips with an ElevenLabs voice clearly fall under the "realistic" rules on all three platforms, so labeling is mandatory. The cartoon แมวตีสอง is likely exempt on YouTube but still voiced by AI, so keep labeling for consistency and trust.
- Don't strip C2PA metadata to dodge labels. The penalty risk on Meta and the platforms' own watermark detection make that counterproductive.

### Gaps
- TikTok's official 2026 ads policy page and the current YouTube Help wording were not fetched directly. The YouTube findings come from 2024 sources plus the help page summary.
- I couldn't confirm whether Codex CLI image output keeps C2PA metadata after the pipeline's ffmpeg re-encode. It likely doesn't survive inside the MP4; untested.
- Thailand-specific AI disclosure law was not researched.
