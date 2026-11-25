# AI production of watercolor / hand-drawn characters for vertical shorts

Context: pipeline = Codex (GPT-image) stills + Python/ffmpeg + Depth Anything parallax (`tools/parallax.py`) + optional rented GPU. Research done 2026-11-25 with ~10 searches; many prompt sources are vendor blogs (anecdotal, not tested benchmarks).

## 1. Prompt vocabulary and avoiding "AI watercolor" tells

### Takeaway
Describe the physical medium (paper, pigment behavior, edges, untouched white paper) rather than just saying "watercolor", keep to one aesthetic, and remove glossy/digital adjectives. Real paper grain is best added in post as an overlay or displacement map, not trusted to the generator.

### Cited Findings
- Effective phrases repeated across guides: "wet-on-wet watercolor technique, transparent washes, visible paper texture, cold press watercolor paper, granulating pigments"; also drybrush, preserved white paper ("white space preserved") — [gptprompts.ai](https://gptprompts.ai/ai-image-styles/watercolor); [CrePal](https://crepal.ai/prompts/watercolor-prompts); [Picsart](https://picsart.com/tutorials/how-to-prompt-for-specific-art-styles-with-ai/)
- If surfaces look airbrushed, the wording is "still too digital": add medium language, remove glossy adjectives — [aiphotogenerator.net (Ghibli watercolor guide)](https://www.aiphotogenerator.net/blog/2026/05/studio-ghibli-watercolor)
- Mixing too many techniques confuses the model and flattens the look; keep one aesthetic — [Recraft illustration guide](https://www.recraft.ai/docs/prompt-engineering-guide/use-cases/illustration)
- QA tip: judge edges, outlines and exposed white paper, not color; if opaque, simplify palette and ask for thin translucent washes — [sider.ai Nano Banana watercolor workflow](https://sider.ai/en/blog/ai-image/nano-banana-pro-watercolor-style-a-practical-workflow)
- Flux watercolor LoRAs exist: "WATERCOLOR (FLUX) V1" (triggers "watercolor", "wet on wet", weight ~0.8, CFG 2–5, 14–22 steps) — [CivArchive mirror](https://civarchive.com/models/840424); Watercolor Sketch Style [FLUX] — [Civitai 755100](https://civitai.com/models/755100); Watercolor Botanical — [Civitai 2697458](https://civitai.com/models/2697458/watercolor-botanical-by-elef); Flux-Watercolor-Strokes (trigger "WTRCLR") — [Hugging Face](https://huggingface.co/gokaygokay/Flux-Watercolor-Strokes-LoRA); "Yet Another Watercolor Style" (SDXL-synthetic, built to stack with other LoRAs) — [Civitai 967921](https://civitai.com/models/967921); hosted API version — [Replicate lucataco/flux-watercolor](https://replicate.com/lucataco/flux-watercolor/readme)
- Lower CFG is suggested for softer edges in Stable Diffusion — [search summary of vendor guides, e.g. zsky.ai](https://zsky.ai/blog/ai-painting-prompts-guide.html)
- Post-production paper texture: Adobe's watercolor tutorial uses a high-contrast paper image as a Displacement Map (luminance channel), with only slight displacement so edges distort without breaking — [Adobe: watercolor bleeding](https://www.adobe.com/learn/after-effects/web/watercolor-bleeding)

### Inferences
- Typical AI tells (uniform texture everywhere, fake bleed blooms in every shape, smooth gradients, crisp digital edges) are countered by: asking for restraint ("most areas flat light wash, few hard edges, large untouched paper areas, loose unfinished edges at the borders, visible pencil underdrawing"), then in post multiplying a single REAL scanned paper texture over every frame (same texture = consistency, and it moves the grain off the AI). In ffmpeg this is a `blend=all_mode=multiply` with a static paper PNG, plus slight `noise`; it does not depend on the generator.
- For Codex, keep one fixed `image_style` string containing the medium vocabulary (the repo already supports shared `image_style` + `image_rules`, as used for the cat-2am cartoon).
- A local Flux+LoRA route needs a rented GPU; only worth it if Codex output keeps looking "too clean".

### Gaps
- No rigorous comparison of GPT-image vs Midjourney vs Flux for watercolor realism found; evidence is vendor anecdotes.
- Current Civitai availability/licensing of each LoRA was not verified (several links are mirrors).

## 2. Character consistency across watercolor images

### Takeaway
Loose styles make faces drift; the standard fix is a reference image (character sheet) attached on every generation plus a fixed style reference/palette. Midjourney separates character (`--oref`) and style (`--sref`); Codex/GPT-image does it by attaching the sheet as an input image.

### Cited Findings
- Midjourney Omni Reference puts characters/objects from a reference image into new images; V7 only; costs 2x GPU time — [Midjourney docs: Omni Reference](https://docs.midjourney.com/hc/en-us/articles/36285124473997)
- Style Reference can be combined with Omni/Character references; `--sv 6` is default — [Midjourney docs: Style Reference](https://docs.midjourney.com/docs/style-reference)
- Third-party guide: Midjourney recommends oref+sref together for sequences; the same image can be both; weight ~100–150 for tight consistency, avoid very high `--ow` (e.g. 400) as quality degrades — [echai.ventures](https://echai.ventures/how-founders-use-ai/video-image-audio/how-do-you-keep-characters-and-brand-look-consistent-across-ai-generated-scenes-and-assets) (secondary)
- A Midjourney docs page mentions up to 4 reference images "replacing Omni Reference and Character Reference" — conflicting/possibly newer; verify — [Midjourney docs](https://docs.midjourney.com/docs/character-reference)

### Inferences
- In this repo, `image_refs` (character sheet attached to the Codex run, built for cat-2am) is the direct equivalent; same approach should work for a watercolor host: one turnaround sheet + 3–4 expression heads, plus a written fixed descriptor (hair, outfit, a signature color) in every prompt.
- Palette locking: name 4–5 fixed pigments in `image_style` (e.g. "indigo, burnt sienna, sap green, rose madder, warm gray") and optionally apply one shared color-grade LUT in ffmpeg to pull drift back.
- Keep faces small/mid-shot and simple (dot eyes, minimal features); looseness hides less in close-ups. Simpler designs drift less.

### Gaps
- No source measured face drift specifically in watercolor vs other styles.

## 3. Animation fit

### Takeaway
Parallax works on painted images but disocclusion edges stretch/smear; soft painted edges make it more forgiving than photos, but the subject outline is where artifacts show. Hand-made feel comes from low-frame-rate "boil" (texture/displacement stepped ~4x/sec) and paper-texture displacement; these are cheap in ffmpeg/Python.

### Cited Findings
- Depth-based warping either leaves holes or stretches content at disocclusions; diffusion fill looks too smooth — [SIGGRAPH 2022 ParallaxBG poster](https://yaksoy.github.io/papers/SIG22c-ParallaxBG.pdf)
- Better method: cut layers at depth discontinuities and inpaint only behind the background side (context-aware layered depth inpainting) — [3D Photography using Context-aware Layered Depth Inpainting, arXiv 2004.04727](https://arxiv.org/pdf/2004.04727)
- Line boil: adjustment layer with Turbulent Displace, stepped via Posterize Time around 4 fps so it reads hand-drawn rather than smooth wobble — [PremiumBeat: line boil](https://www.premiumbeat.com/blog/how-to-create-line-boil-animations); [PremiumBeat: wiggle text line boil](https://www.premiumbeat.com/blog/wiggle-text-line-boil)
- Turbulent Displace gives lines a pencil-like bumpy texture, sometimes too wavy — [Creative Cow forum](https://creativecow.net/?p=245825)
- Paper-texture displacement map for watercolor bleed edges — [Adobe](https://www.adobe.com/learn/after-effects/web/watercolor-bleeding)

### Inferences
- For `tools/parallax.py`: keep zoom/pan small on watercolor (cat-2am already uses margin 0.06/zoom 0.06/pan 0.02) and blur/dilate the depth map at edges; a simple subject-on-plain-paper composition (lots of white) hides disocclusion because the revealed area is just paper.
- Boil in ffmpeg: pre-render 3 slightly different noise/displacement versions of the paper overlay and cycle them at 8 or 12 fps (hold each 2–3 frames) over the parallax output — the "stepped" rate is the key, per the tutorials.
- Ink-bleed transitions: use a real ink-bleed/paint-spread alpha matte clip (stock or self-made) as the transition mask (ffmpeg `maskedmerge`), instead of a crossfade. CLAUDE.md/vertical-edit skill says hard cuts by default, so use sparingly (scene changes only).
- Image-to-video models (Kling/Runway/Veo etc.) tend to re-render texture each frame, causing flicker and "melting" brush strokes; parallax + boil keeps the painting intact and is cheaper. Treat i2v as an occasional hero-shot only. (Not verified by sources found — see Gaps.)
- Mouth swaps: for a painted character, a small set of hand-chosen mouth shapes (closed/open/o) composited by amplitude of voice is more on-style than lip-sync models (the repo's MuseTalk/InfiniteTalk tests were rejected even on realistic faces). Frame-by-frame tools like Procreate Dreams fit manual hero moments, not daily volume.

### Gaps
- No sources found on how Depth Anything performs on watercolor specifically, nor on image-to-video quality with watercolor input, nor Procreate Dreams production use; needs a local POC.

## 4. Hybrid workflows, credibility, legal

### Takeaway
Style itself is generally not copyrightable, but specific works/characters are; naming living artists is blocked by OpenAI and ethically risky (avoid "Puuung style" / "Ghibli style" prompts — describe traits instead). Pure AI output has no US copyright; human sketch, selection, arrangement and edits add protection. Platforms require AI labels mainly for realistic content, but this channel's rule is to tick the label always.

### Cited Findings
- US Copyright Office (Part 2, 29 Jan 2025): prompts alone are not sufficient control for authorship; human selection, arrangement or modification can be protected (not the AI material itself); AI as an assistive tool does not block protection; case-by-case — [Copyright Office NewsNet](https://www.copyright.gov/newsnet/2025/1060.html); [Jones Day summary](https://www.jonesday.com/en/insights/2025/02/copyrightability-of-ai-outputs-us-copyright-office-analyzes-human-authorship-requirement)
- Style generally not protected; specific films, scenes, characters are — [CTV News](https://www.ctvnews.ca/sci-tech/article/chatgpts-viral-studio-ghibli-style-images-highlight-ai-copyright-concerns/)
- Japan's Agency for Cultural Affairs stance: imitating style without reproducing Ghibli scenes/stories is hard to treat as infringement — [Asia Economy](https://www.asiae.co.kr/en/article/2025040209072774447)
- CODA (incl. Studio Ghibli) demanded OpenAI stop training Sora 2 on members' content (Oct–Nov 2025) — [TechCrunch](https://techcrunch.com/2025/11/03/studio-ghibli-and-other-japanese-publishers-want-openai-to-stop-training-on-their-work)
- OpenAI refuses generations "in the style of individual living artists" but allows "broader studio styles" (March 2025) — [TechCrunch](https://www.techcrunch.com/2025/03/28/openai-peels-back-chatgpts-safeguards-around-image-creation); enforcement inconsistent — [OpenAI community](https://community.openai.com/t/gpt-4o-image-generation-hitting-the-content-policies-restrictions-on-literally-everything/1185783)
- Precedent backlash: Kim Jung Gi model trained without permission drew strong backlash; Japanese artists' "No AI Learning" protests — [Rest of World](https://restofworld.org/2022/ai-backlash-anime-artists/); Korean webtoon style debate — [UBC IP law](https://iplaw.allard.ubc.ca/?p=13366)
- YouTube: disclosure needed for realistic altered/synthetic content; fully animated unrealistic content is exempt — [YouTube Help](https://support.google.com/youtube/answer/14328491)
- TikTok: label required for realistic AI images/audio/video; auto-labels detected AI content (C2PA) — [TikTok Support](https://support.tiktok.com/en/using-tiktok/creating-videos/ai-generated-content)

### Inferences
- Prompt by traits, not names: e.g. "soft romantic couple illustration, simple rounded faces, warm muted washes, everyday domestic moments" instead of "Puuung style". Never reproduce a known character/scene.
- Hybrid credibility ranking (most to least defensible/authentic): human sketch -> AI color/paint (img2img or Codex with sketch as reference); AI base -> human paint-over of face/hands + real paper texture; pure AI. Even a rough human line pass on the character sheet strengthens both authorship and consistency.
- Labels: watercolor clips with an AI voice may not strictly need a label on YouTube (not realistic), but the channel already always ticks the AI label (CLAUDE.md) — keep doing so; it also avoids backlash in the art community that dislikes undisclosed AI watercolor.

### Gaps
- Puuung-specific AI controversy: no sources found.
- Thai copyright law on AI output not researched (no source found in this pass); OpenAI's current (late 2026) living-artist policy not confirmed beyond 2025 reporting.
