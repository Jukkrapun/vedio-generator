# AI generation of semi-realistic anime characters for vertical short video (as of 2026-11)

Scope note: about 10 tool calls. The Midjourney official docs page returned 403, so the Midjourney details come partly from secondary guides. Points marked "(unverified)" have no confirmed primary source.

## 1. Prompt vocabulary per model (GPT-image / Midjourney / Flux-SDXL), negatives, avoiding the "generic AI anime face"

### Takeaway
"Semi-realistic anime" (also called 2.5D) is best done on SDXL/Illustrious-based 2.5D checkpoints, where a "realistic" tag or LoRA weight sets how real it looks. GPT-image (the model behind ChatGPT/Codex) does it through a fixed style block written in plain language. For Midjourney there is no verified niji 7 guidance.

### Cited Findings
- OpenAI's prompting cookbook recommends gpt-image-2 for new work. With several reference images, it advises labeling each input by number and description, then stating how they should interact. — [OpenAI Cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
- A community anime template for GPT-image puts a fixed opening line first, followed by separate lines for hair, hairstyle and eyes. The author says this avoids multi-panel outputs and improves consistency. This is anecdotal. — [OpenAI community forum](https://community.openai.com/t/stable-single-character-anime-prompt-template-avoids-multi-panel-issues/1379868)
- Style-locking workaround: repeat the same style block (aspect ratio, line quality, lighting) before every scene. — [OpenAI community](https://community.openai.com/t/need-for-character-consistency-and-style-locking-in-image-generation/1232362)
- Semi-real anime checkpoints for SDXL/Illustrious:
  - yomama 2.5D Illustrious recommends the positive prompt "masterpiece, best quality, realistic". If the result looks too 2D, lower the anime LoRA weight. The author warns that manga/anime characters come out less realistic than 3D game characters. — [HF mirror](https://huggingface.co/LyliaEngine/yomama25DIllustrious_illustriousV20)
  - illust-Vector-2.5D_IL sets the level of realism through the prompt. Author's settings: 25 steps, CFG 5, dpmpp_sde, 832x1536 (close to 9:16). — [CivArchive](https://civarchive.com/models/2066425/illust-vector-25dil)
  - Mistoon_Sapphire V3 is Illustrious-based and aims for "2.5d" while keeping a modern anime look. — [PromptHero](https://prompthero.com/ai-models/mistoon_sapphire-download)
  - CSTATI Anime XL 2.5D Soft: the author advises against heavy quality tags because they push the image toward hyper-realism. — [CivArchive](https://civarchive.com/seaart/models/0ecc551dda8babb8c20a746ddde8bd59/versions/1049381e53609c520fd41017de23b073)
  - Illustrious2.5D Semi-Realistic Anime Style Model — [RunningHub](https://www.runninghub.ai/model/public/2074105720613728257)

### Inferences
- The realism level is a "dial", not an on/off switch. Turn it with LoRA weight, a "realistic" tag, or fewer quality tags. Too many "masterpiece/best quality/ultra detailed" tags tend to give a waxy, generic look, or tip the image into a fully real face.
- To avoid the "generic AI anime face", write a character spec with specific features (face shape, eye shape, mole, a defining hair detail, eyebrow shape) instead of "beautiful anime girl". Also describe real lighting and film grain (for example, the dim, late-night light this channel already uses) in place of shiny "glossy" lighting.
- For Codex/GPT-image, which this project already uses: keep one fixed style block (for example "semi-realistic anime illustration, painterly cel shading with soft realistic lighting, subtle skin texture, natural proportions") and put it in `image_style` for every segment. This matches the community advice above.
- GPT-image does not take negative prompts as a parameter. Write the constraints inside the prompt instead ("no text, single panel, no extra fingers"). SDXL uses a normal negative prompt (for example lowres, bad hands, extra fingers, 3d render, photo). That list is standard practice in the community; no single source was opened for it.

### Gaps
- No official niji 7 or V7 "style raw" guide for semi-real anime was found. The docs.midjourney.com page returned 403.
- No direct comparison of Flux (or Flux anime fine-tunes) against Illustrious for 2.5D was found.
- Current Civitai download counts and licenses for each checkpoint were not checked. Some checkpoints carry non-commercial terms, so check each license before use.

## 2. Consistency: character sheets, reference images, --oref/--cref, LoRA; failure modes

### Takeaway
On Midjourney V7, use `--oref` (Omni Reference). `--cref` is the older V6.1 parameter. On GPT-image/Runway, use a clear, front-facing reference plus a repeated text spec. For the highest consistency on SDXL, train a character LoRA. A reference makes the character more consistent but does not guarantee an identical copy.

### Cited Findings
- Omni Reference works only on V7. It combines with style references and image prompts, costs about twice the GPU time of a normal V7 image, and does not support inpaint/outpaint. — [Midjourney docs via search](https://docs.midjourney.com/hc/en-us/articles/36285124473997); [Midjourney updates](https://updates.midjourney.com/omni-reference-oref/)
- `--ow` (omni weight) controls how closely the image follows the reference. Third-party guides disagree on its range (1–1000 with default 100, vs 0.5–1.0). Check the official docs. — [CometAPI](https://www.cometapi.com/how-to-use-omni-reference-in-midjourney-v7); [Aiarty](https://www.aiarty.com/midjourney-guide/midjourney-omni-reference.htm)
- `--cref` belongs to V6.1; V7 uses `--oref`. — [Geeky Gadgets](https://www.geeky-gadgets.com/midjourney-character-consistency-guide/)
- Runway advises one consistent style per character and a clear, front-facing reference with simple lighting and background. A reference improves consistency but does not guarantee exact duplication. — [Runway](https://runwayml.com/resources/ai-character-references-tips); [Runway Gen-4 References](https://help.runwayml.com/hc/en-us/articles/40042718905875-Gen-4-Image-References-Guide)
- Recurring characters can lose visual consistency across generations, according to OpenAI's guide as summarized by a third party. — [Atlas Cloud blog](https://www.atlascloud.ai/blog/tips/gpt-image-2.6-consistent-character)
- Character turnaround sheets can be made with GPT Image 2. — [Dreamina](https://dreamina.capcut.com/resource/gpt-image-2-for-character-turnaround-sheets); [Kapwing](https://www.kapwing.com/resources/how-to-create-a-character-reference-sheet-with-ai/)

### Inferences
- Suggested pipeline for this repo: make a character sheet (front, 3/4, side, plus 3–4 expressions), keep it in `shared/characters/<name>/reference/`, and attach it through `image_refs` (already used with cat-2am). Repeat the same appearance spec in every prompt.
- Failure modes to check during review: face drift (eye shape or face shape changes), age drift (the character looks younger or more "moe" in some scenes), outfit or hair-color drift, hands and fingers, and style drift (some frames look 3D, others flat). Fixes: crop tighter so hands are not in frame, use the same light and angle as the reference, and redo only the scenes that fail.

### Gaps
- No measured consistency rates were found. The "90%+" figures in blogs have no source.
- No verified source was found on whether `--oref` works with niji 7.

## 3. Animation: 2.5D parallax, image-to-video, Live2D, lip-sync on anime faces

### Takeaway
For volume, keep the repo's existing parallax. For important shots, use image-to-video (Kling, Hailuo, Veo, Runway). For talking from a single image, Hedra Character 3 is the simplest option. Kling's lip-sync accepts anime input. Quality is mixed and should be tested on your own character.

### Cited Findings
- Hedra starts from a still image, while Kling and Runway work from video and track the lips. One test found the end results similar. In a static-face round Hedra won and Runway looked most real overall. — [Tom's Guide](https://www.tomsguide.com/ai/ai-image-video/lip-sync-battle-i-put-3-leading-ai-video-tools-to-the-test)
- Kling generates the video first, then runs a mouth-matching step. — [Tom's Guide](https://www.tomsguide.com/ai/ai-image-video/kling-just-added-lip-syncing-and-its-a-game-changer-for-ai-video)
- Kling's lip-sync accepts anime artwork as input. — [Scenario](https://help.scenario.com/en/articles/lip-sync-models-overview); Kling also has an anime lip-sync page — [Kling](https://kling.ai/explore/anime_video_generation_kling_ai_lip_sync)
- A 2026 guide recommends Hedra Character 3 for talking or singing from one image, and HeyGen Avatar IV for stylized or anime portraits. — [Elser AI](https://www.elser.ai/blog/best-ai-video-generators-lip-sync-anime-music-videos-2026)
- Kling looks good, but its lip-sync is less natural than Seedance 2.0, and Hedra Character 3 can be unpredictable. — [Curious Refuge](https://curiousrefuge.com/blog/ai-lip-sync-workflows)
- Live2D: the company does not limit content or production methods, including AI, as long as use is within its terms. The free material license allows commercial use only for businesses with annual sales under 10 million yen. — [Live2D](https://www.live2d.com/en/business/slp/); [Live2D free material license](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html)

### Inferences
- Anime faces have simple mouths, so lip-sync errors may be less noticeable than on realistic faces. But a semi-real face sits in between and may hit the uncanny valley more easily. Test with 1–2 clips before committing to a pipeline.
- Live2D needs the image split into layers (rigging) per character. It costs a lot up front but gives a reusable, controllable result. That suits a recurring host, not one-off scenes.
- Image-to-video often makes faces drift during the shot. Keep shots to 3–5 seconds (this matches the channel's visual-change-every-3–5s rule) and use slow, simple camera moves.

### Gaps
- No up-to-date (2026) per-second price comparison for Kling, Hailuo, Veo and Runway on anime input was found.
- No test was found that directly compares Veo or Hailuo on semi-real anime.

## 4. Legal: style vs copying artists, artist-name prompts, platform AI labels

### Takeaway
In the US, style itself is not protected by copyright, but output that imitates a specific artist's style closely remains a market-dilution risk and an ethics risk. A lawsuit already has a "Midjourney Named Artist Class". Avoid putting living artists' names (Shinkai, Kuvshinov, etc.) in prompts and describe the visual traits instead. On platforms, clearly non-realistic anime does not have to be labeled on YouTube, but labeling semi-real work anyway is safer and matches the channel's existing practice.

### Cited Findings
- The US Copyright Office (report Part 3, 2025) notes that copyright does not protect style as such. But in the fourth fair-use factor it raises market dilution from outputs that resemble an original style. — [Skadden](https://www.skadden.com/-/media/files/publications/2025/05/copyright_office_weighs_in_on_ai_training_and_fair_use.pdf)
- Report Part 2: prompts alone do not give enough human control for the user to count as the author, so purely AI output generally cannot be copyrighted. — [Copyright Office](https://copyright.gov/newsnet/2025/1060.html?loclr=eanco); [Artnet](https://news.artnet.com/art-world/ai-art-us-copyright-office-2604297)
- Andersen v. Stability AI: artists sued AI image makers. An August 2024 order addressed a "Midjourney Named Artist Class" of artists whose names were used in prompts. — [Its Art Law](https://itsartlaw.org/2024/02/26/artificial-intelligence-and-artists-intellectual-property-unpacking-copyright-infringement-allegations-in-andersen-v-stability-ai-ltd/); [NYIPLA materials](https://www.nyipla.org/images/nyipla/Programs/2025April29CopyrightAI/2025April29CopyrightAI%20-%20Materials.pdf)
- YouTube requires disclosure only for content that looks realistic. Content that is "not realistic" made with AI (for example an animated fantasy world) is exempt, though YouTube may add its own label to non-photorealistic or animated AI content. — [YouTube Help](https://support.google.com/youtube/answer/14328491?hl=en)
- TikTok requires labels on realistic AI content (images, video, audio). It can label automatically (C2PA, its own AI effects) and is testing invisible watermarks. — [TikTok Transparency](https://www.tiktok.com/transparency/en/supporting-responsible-transparent-ai-generated-content/); [TikTok Newsroom 2025-11](https://newsroom.tiktok.com/more-ways-to-spot-shape-and-understand-ai-generated-content?lang=en-GB)
- A TU Delft study (2025) found most labels are applied by creators, and labels added by the platforms are rare. — [TU Delft](https://repository.tudelft.nl/file/File_629244e4-d687-4934-9a0c-e2ce0d95d851?preview=1)

### Inferences
- Semi-realistic is a gray zone under the "realistic" rule. The channel already ticks the AI label every time (per CLAUDE.md), so keep doing that.
- Replace artist names with descriptions, for example "luminous sky gradients, detailed cinematic backgrounds, lens flare" in place of "Shinkai style", and "soft painterly portrait, warm skin tones" in place of "Kuvshinov". This cuts both the legal and the ethical risk.
- Because purely AI output may not be copyrightable, the channel may not be able to stop others from copying its character. Human contributions (character design, editing, story) give more protection.

### Gaps
- Thai law on AI output and style imitation was not researched.
- No confirmed source was found naming Shinkai or Kuvshinov in a lawsuit or in the report.
- The primary TikTok policy page redirected and was not read in full.
