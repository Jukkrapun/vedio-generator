# AI generation of webtoon / clean-line cartoon characters for vertical short video

## Prompt vocabulary and style control (GPT-image, Midjourney niji, SDXL/Flux LoRAs)

### Takeaway
No model has a dedicated "webtoon" switch. The style comes from explicit words for line and color (clean lineart, flat colors, cel shading, little or no gradient) plus a style LoRA or style reference. On SDXL-family models, flat-color and lineart LoRAs are what pull images away from the default painterly rendering.

### Cited Findings
- Lovart's character-spec template has a "color treatment" field with the options flat colors / gradient shading / cel shading / realistic lighting. It recommends writing the spec down as a document (art style, palette, reference poses). — [Lovart](https://www.lovart.ai/ko/blog/how-to-generate-consistent-characters-ai-bing)
- "Line Art + Flat Colors SDXL" (a Civitai reprint) uses the trigger words `lineart, flat colors`. — [Tusiart](https://tusiart.com/models/742655164676262965); [Tensor.art](https://tensor.art/models/742655164676262965)
- The "Flat Color Style" LoRA for Illustrious pulls Illustrious models away from their default heavy rendering toward flat color-manga pages. It is "flat but not posterized". — [Civitai search result / HF mirror](https://huggingface.co/UnifiedHorusRA/Flat_Color_-_Style/blob/main/README.md)
- The "Flat Color Style [IL]" LoRA is described as art with "little to no shading and color blending", trained mostly on manga-style characters. — [Tensor.art](https://tensor.art/models/894357322535588213)
- The "Rogue ligne claire" comic LoRA has SDXL and Illustrious versions. The author reports they work with SDXL, Juggernaut XL, RealCartoon XL and Illustrious checkpoints. — [Civitai](https://civitai.com/models/1693007/rogue-ligne-claire-comic-book-illustrator)
- There is a Hugging Face research repo on webtoon-style generation. — [treksis/WebtoonResearch](https://huggingface.co/treksis/WebtoonResearch)
- In the searches run, no LoRA was labeled specifically "webtoon". Base-model tags (SDXL vs Illustrious vs NoobAI) must match, because LoRAs don't transfer reliably between them. — search result summary over the links above.
- Midjourney: Style Reference (`--sref`) has six versions in V7, chosen with `--sv` (default 6; sref codes and random only with `--sv 4/6`). Omni Reference (`--oref`) is V7-only, costs 2x GPU time, and can be combined with sref. — [MJ Style Reference docs](https://docs.midjourney.com/docs/style-reference); [MJ Omni Reference docs](https://docs.midjourney.com/hc/en-us/articles/36285124473997)
- Niji 7 (Jan 9, 2026) is the anime/manga lane and supports Personalization and Moodboards. `--cref` is a Niji 6 / V6-era control. These details come from a third-party guide, not official docs. — [blakecrosley guide](https://blakecrosley.com/en/guides/midjourney); [Medium Niji 7](https://medium.com/@tdrs/midjourney-niji-7-af2ebe532532)
- OpenAI publishes an image-gen prompting guide (cookbook). — [OpenAI cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)

### Inferences
- A practical GPT-image/Codex positive block: "2D webtoon-style digital illustration, clean uniform black lineart, consistent line weight, flat cel shading with at most one hard-edged shadow tone, limited palette, solid color fills, no gradients, no painterly texture, no film grain, no noise, no photorealism". The project's `image_rules` key (used in poc/cat-2am) is the right place for it.
- The same block should spell out what to avoid. GPT-image has no negative-prompt field, so the "no ..." phrases have to go in the prompt itself.
- Midjourney niji with a fixed `--sref` code is the simplest way to lock a style. It is not scriptable like Codex, though, so it is a poor fit for the automated pipeline.

### Gaps
- No primary source found for exact line-weight control parameters in GPT-image. Advice there is empirical.
- No Flux-specific webtoon LoRA was verified in this pass.

## Consistency (character sheets, references, LoRA, palette) and failure modes

### Takeaway
The standard workflow: make one master character sheet (multi-angle, flat lighting), attach it as a reference to every generation with an explicit "keep style/colors/proportions unchanged" line, and change only the scene or pose text. Train a LoRA when you need many images on SDXL/Flux.

### Cited Findings
- GPT-Image-2.5 accepts up to 16 reference images. Say what each reference is for: if the prompt only describes the scene, the model treats the references as loose inspiration. — [Runware docs](https://runware.ai/docs/models/openai-gpt-image-2-5-flare/guides/subject-consistency.md)
- Generate a multi-angle identity sheet under flat lighting to settle face proportions, eye shape and hair. — [fal.ai guide](https://fal.ai/learn/tools/ai-character-consistency); [Kapwing reference sheet](https://www.kapwing.com/resources/how-to-create-a-character-reference-sheet-with-ai/)
- Example style-lock prompt: "Use the provided image as the exact character reference. Do not change colors, facial features, proportions, or style." — [SSW rules](https://www.ssw.com.au/rules/consistent-ai-generated-characters)
- Reuse the same reference across calls and change only the scene, pose or outfit parts of the prompt. — [Replicate blog](https://replicate.com/blog/generate-consistent-characters); [apiframe](https://apiframe.ai/guides/character-consistency-ai-image-api)
- Users on the OpenAI forum ask for real character and style locking, which suggests drift is a known pain point. — [OpenAI community](https://community.openai.com/t/need-for-character-consistency-and-style-locking-in-image-generation/1232362)

### Inferences
- Expected failure modes, based on general experience and not on sources found here:
  - line weight thickening or thinning between shots
  - hue and saturation creeping
  - the shadow style switching from cel to soft gradient
  - face proportions changing in wide shots
  - small accessories disappearing
- Mitigations:
  - put hex palette values in the prompt
  - keep the sheet in every call (the project's `image_refs` key already does this)
  - do QA side by side
  - regenerate single images instead of the whole set

### Gaps
- No quantitative data found on drift rates per model.

## Animation fit (parallax, motion comics, cut-out/Live2D, mouth swaps, image-to-video)

### Takeaway
Cut-out / 2.5D rigging is the industry approach for flat anime-style art. AI layer splitting (See-through, 2026) can produce a draft layered PSD, but hidden areas still need manual completion. For this channel, motion-comic style is the realistic choice: parallax with small margins, plus panel and text animation.

### Cited Findings
- The See-through paper (arXiv 2602.03749, 2026) splits a single anime image into layers for 2.5D animation such as Live2D. It notes that the fixed layer order assumed by earlier diffusion methods doesn't fit animation needs. — [arXiv](https://arxiv.org/html/2602.03749)
- The See-through GitHub exports a layered PSD. Its maintainers say a full image-to-Live2D pipeline needs much more than layer decomposition. — [GitHub](https://github.com/shitagaki-lab/see-through)
- A Live2D Inc./JAIST paper splits illustrations into production layers: line art, flat color, shadow, highlight. — [arXiv 2603.14925](https://arxiv.org/html/2603.14925)
- A July 2026 preprint generates ordered RGBA layers, meshes and keypose offsets from one image. It notes that hand-authoring a Live2D model still takes weeks. This is from an aggregator listing and is unverified. — [alphaXiv](https://www.alphaxiv.org/abs/2607.27348)
- CLIP STUDIO PAINT tutorial: when cutting parts out of a flattened image you must also paint in what is hidden behind them. — [Clip Studio Tips](https://tips.clip-studio.com/en-us/articles/2684)
- AI splitters can't tell whether a hidden cheek or eyelid has enough artwork. This comes from vendor marketing. — [LlamaGen](https://llamagen.ai/uz/features/ai-layer-splitter/live2d-preparation)

### Inferences
- Depth maps (Depth Anything) on flat art: flat fills give weak or noisy depth cues, so expect warping at character edges and stretched lines. Keep zoom and pan small, as the project did in poc/cat-2am: margin 0.06, zoom 0.06, pan 0.02, and the user passed that POC. A cleaner option is to generate the character and background as separate images and do layered parallax.
- Mouth swaps: generate 3–4 mouth shapes from the sheet (closed / open / O / smile) and switch them on the alignment timing the repo already has (ElevenLabs alignment). This is cheap and fits flat style better than MuseTalk.
- Image-to-video models on line art tend to re-render lines and add shading. Use them only for short accent shots.

### Gaps
- No source found here on After Effects Duik or Spine for AI art, or on benchmarks of i2v models on line art.

## Legal and platform notes

### Takeaway
Describe "webtoon-style clean line art" in generic terms. Never name specific titles or artists, and don't use the WEBTOON name or logo. Tick the AI labels on every platform. Expect strong reader backlash against AI in the Korean webtoon community.

### Cited Findings
- "WEBTOON" is a registered US word mark of Naver Webtoon (e.g. reg. 4212652). Naver also registered it in other countries, which drew industry criticism. — [Justia](https://trademarks.justia.com/853/94/webtoon-85394119.html); [Korea Herald via Daum](https://v.daum.net/v/20211213174131980)
- The WEBTOON Terms forbid removing or altering trademarks and say uploads must not infringe others' copyright or trademark. NAVER's brand guide forbids implying affiliation or endorsement. — [WEBTOON Terms](https://www.webtoons.com/en/terms); [NAVER brand guide](https://navercorp.com/en/company/brandGuide)
- 2023: readers suspected AI use in a Naver webtoon. Blue Line Studio admitted using AI for final adjustments and re-uploaded the episode without it. Creators then boycotted AI-generated webtoons. — [Korea JoongAng Daily](https://www.koreajoongangdaily.com/business/creators-boycott-aigenerated-webtoons-on-naver/11866608); [allkpop](https://www.allkpop.com/article/2023/06/naver-webtoon-is-looking-into-setting-up-regulations-on-ai-generated-art)
- 2023: a Korean webtoon was accused of using AI images traced from the Mushoku Tensei anime. — [ANN](https://www.animenewsnetwork.com/interest/2023-05-26/korean-webtoon-accused-of-using-ai-images-tracing-mushoku-tensei-anime/.198458)
- 2025: the WEBTOON Creators Union says contracts allow AI training without consent. WEBTOON says "we do not train AI on creators' content". — [ANN](https://www.animenewsnetwork.com/feature/2025-11-06/webtoon-disputes-union-unpaid-labor-allegations/.230725)
- Naver says it uses AI to boost productivity and offers creator tools such as AI Painter. — [Daum](https://v.daum.net/v/20250306070051944); [MIT Tech Review](https://www.technologyreview.com/2025/04/22/1114874/generative-ai-south-korea-webcomics/amp/)
- Oct 2026: the Korean cartoonists' association took demands for AI consent, mandatory AI labeling and training transparency to UNESCO. About 90% of members surveyed didn't know how to stop their work being used for training. — [Korea Times](https://www.koreatimes.co.kr/entertainment/20261030/korean-cartoonists-take-demands-for-ai-consent-copyright-safeguards-to-unesco)
- A May 2025 amendment to Korea's Content Industry Promotion Act proposed AI-content guidelines. Whether it passed is unknown. — [Korea Times](https://www.koreatimes.co.kr/amp/lifestyle/trends/20251106/webtoon-industry-seeks-ai-edge-amid-legal-ethical-challenges)
- TikTok: creators must label content that is fully generated or significantly edited by AI. TikTok may auto-label, and it is testing invisible watermarking (Nov 2025). — [TikTok support](https://support.tiktok.com/en/using-tiktok/creating-videos/ai-generated-content); [TikTok newsroom](https://newsroom.tiktok.com/more-ways-to-spot-shape-and-understand-ai-content?lang=en)
- YouTube requires disclosure of "realistic altered or synthetic content". Reports say it now auto-labels significant photorealistic AI content and C2PA-flagged content. — [HubSpot](https://blog.hubspot.com/ai/youtube-sets-new-labeling-guidelines); [TNW](https://thenextweb.com/news/youtube-will-now-automatically-label-ai-generated-videos-whether-creators-disclose-them-or-not)

### Inferences
- YouTube's rule targets *realistic* content, so a cartoon may not strictly need the label there. The channel's policy is to always tick AI labels, and that is the safer default.
- Don't put "webtoon"/"WEBTOON" in titles or hashtags in a way that implies a link to the platform. Generic "การ์ตูน" or "cartoon" is safer.

### Gaps
- No official current WEBTOON/LINE Webtoon policy on accepting AI-generated submissions was found.
- No Thai-law-specific AI or style-copyright guidance was researched.
- Meta's labeling rules for Reels were not re-checked in this pass.
