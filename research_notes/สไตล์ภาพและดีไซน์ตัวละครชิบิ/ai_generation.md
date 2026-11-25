# Generating Chibi Characters with AI and Keeping Them Consistent (2026)

## Prompt vocabulary and structure (GPT-image/Codex, Midjourney, SD/Flux)

### Takeaway
No model has a reliable keyword for "2 heads tall". Plain prompts like "chibi" or "super-deformed" tend to land somewhere around 2–3 heads. To get an exact ratio you need a dedicated LoRA (SD/SDXL) or a reference image. Prompts work best split into a locked identity block and a variable scene block.

### Cited Findings
- Split each prompt into a fixed section (the character's essentials) and a variable section (pose, scene, outfit). The fixed section should be most of the prompt. — [Lovart](https://www.lovart.ai/de/blog/how-to-generate-consistent-characters-ai-bing)
- Chibi is one of the proportion options you can name explicitly, alongside a character spec document (name, physical description, default outfit). — [Lovart](https://www.lovart.ai/ja/blog/how-to-generate-consistent-characters-ai-bing)
- For edits, the GPT Image 2.6 prompting guide says to write "change only X" and list the identity, geometry, layout and lighting details to keep. — [OpenAI GPT Image 2.6 prompting guide](https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2.6)
- SDXL head-ratio LoRAs (cibi02-A / cibi020-B) each fix one ratio. cibi02-A at 0.8 strength gives about 2 heads and slips to about 3 heads at lower strength. Ratios above about 3.5 heads stop reading as super-deformed. The plain "chibi" tag at low strength settles around 2–3 heads. These are archived Civitai pages, partly in Japanese. — [civarchive v1](https://civarchive.com/seaart/models/a74aa324c73f9ddca6e300254d0b7a5c/versions/e68a995ff6bc42bab82a2a53b3bc5fcb), [v2](https://civarchive.com/seaart/models/a74aa324c73f9ddca6e300254d0b7a5c/versions/480c95a407d8afc16d6f6f44bc4c846f), [v3](https://civarchive.com/seaart/models/a74aa324c73f9ddca6e300254d0b7a5c/versions/5a6592cc8e4edfb283d8687dd1fe0a7b)
- Chibi Animals LoRA (Flux + SDXL): triggers "p1nkch1b1p3ts" and "chibi animal", weight 0.8–1. — [civarchive](https://civarchive.com/seaart/models/dd802294921a63a24976d9b8c2582cb7/versions/5ae6ba05416e478c1ab9bd0b19b556ea), [Civitai](https://civitai.com/models/653184)
- 3D/figure-look chibi LoRAs for Flux exist, for example a PVC-collectible chibi LoRA and Chibi-Figure. Neither states a head count. — [HF ABDALLALSWAITI/chibi](https://huggingface.co/ABDALLALSWAITI/chibi/blob/main/README.md), [Tensor.art](https://tensor.art/models/768175383859374303)
- Flux IC-LoRA chibi style. — [HF AIGCDuckBoss](https://huggingface.co/AIGCDuckBoss/flux_IClora_chibi-style/raw/main/README.md)

### Inferences
- For GPT-image/Codex, which has no LoRA or seed control, describe the proportions concretely: "super-deformed chibi, head as large as the rest of the body (2 heads tall), short stubby limbs, mitten-like hands, large eyes, small nose/mouth". Also attach a reference sheet, which matters more than any keyword.
- For a 2D vs 3D look, use a style block. 2D: "flat cel-shaded 2D cartoon, clean lineart, limited palette". 3D: "3D-rendered vinyl/PVC figure look, soft studio lighting, subsurface skin". Avoid naming trademarks such as "Nendoroid" (see the copyright/IP section below).
- Negative prompts (SD/Flux UIs only; GPT-image and Midjourney V7 mostly ignore them, so phrase them positively there): realistic proportions, long legs, extra fingers, mutated hands, multiple characters, text, watermark.

### Gaps
- I found no official OpenAI or Midjourney documentation on chibi-specific keywords. Midjourney prompt guides for chibi weren't checked.
- I found no Flux equivalent of the head-ratio LoRAs.

## Character consistency (reference sheets, references, LoRA, seeds, failure modes)

### Takeaway
The most effective approach is a master character sheet (turnaround, expressions, outfits) fed back in as a reference image every time. Use LoRA training only if you are on SD/Flux. Seeds help only within one model and fixed settings.

### Cited Findings
- Build the reference sheet in stages rather than in one prompt, for more control. Drawing views together in one image keeps them consistent with each other. Then feed the master sheet back in to redraw single views at high resolution. Keep a costume sheet of 3–5 approved outfits. — [Kapwing](https://www.kapwing.com/resources/how-to-create-a-character-reference-sheet-with-ai/), [DEV quolu](https://dev.to/quolu/how-i-made-an-ai-that-cant-draw-the-same-character-create-anime-model-sheets-19cn), [DEV raxxo](https://dev.to/raxxostudios/how-to-create-consistent-ai-characters-for-your-brand-1c5o)
- Log the prompt text, seed, reference filenames and tool settings so the look can be reproduced. — [GearBrain](https://www.gearbrain.com/amp/ai-character-creator-consistency-guide-2677661405)
- The OpenAI edit endpoint accepts up to 16 input images. `input_fidelity` (high/low) controls how closely faces and features are kept on gpt-image-1.5; gpt-image-1-mini supports only low; the 2.6 guide says to omit it. — [OpenAI API ref](https://developers.openai.com/api/reference/resources/images/methods/edit), [2.6 guide](https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2.6)
- Only the first input image is preserved with extra texture richness. For several characters, combine them into one composite reference. With several inputs, a mask applies to the first image. — [OpenAI cookbook](https://developers.openai.com/cookbook/examples/generate_images_with_high_input_fidelity)
- Midjourney V7 `--oref` (Omni Reference) takes one image, with strength set by `--ow`. It doesn't work with Vary Region, Pan or Zoom Out, and it needs V7. A newer docs page describes an Edit Model with up to 4 reference images that replaces Omni Reference and Character Reference. — [MJ docs Omni Reference](https://docs.midjourney.com/hc/en-us/articles/36285124473997), [MJ update](https://updates.midjourney.com/omni-reference-oref/), [MJ docs Edit Model](https://docs.midjourney.com/docs/character-reference)
- A third-party guide recommends `--ow` values of 50–250. This is unverified. — [CometAPI](https://www.cometapi.com/how-to-use-omni-reference-in-midjourney-v7)

### Inferences
- In this repo, the cat-2am POC already passed using `image_refs` (character sheet attached to Codex) plus `image_rules`. Put the sheet first in the reference list (first image = highest fidelity), and give each extra character its own sheet, or one composite.
- Known failure modes, observed in practice but not well documented: proportions creeping toward 3–4 heads in action poses, hand and finger errors, outfit and color drift, and face drift when angles change. Mitigations: restate the ratio in every prompt, use mitten-like hands, keep a palette with hex colors in the locked block, and use the "change only X" edit phrasing.

### Gaps
- I found no quantitative benchmark of consistency across models. Drift percentages quoted by third-party sites couldn't be verified.

## Bringing chibi to motion (parallax, Live2D, VRoid/VRM, image-to-video, lip-sync)

### Takeaway
The cheapest option, and one this repo already runs, is 2.5D parallax. For talking chibi faces, image+audio tools (Hedra-type) handle stills, Kling covers more active motion, and Live2D/VRM give the most control but need rigging work.

### Cited Findings
- In a hands-on review, Hedra (which animates from a still image) won the static-face lip-sync round. Kling and Runway map lip movement onto an existing video. — [Tom's Guide](https://www.tomsguide.com/ai/ai-image-video/lip-sync-battle-i-put-3-leading-ai-video-tools-to-the-test)
- Hedra predicts phoneme-matched mouth movement, head motion and blinks from an image plus audio, and it also hosts third-party models such as Kling AI Avatar v2. — [Hedra guide](https://mkt.hedra.com/blog/ai-lip-sync-video-guide), [Hedra Kling Avatar v2 Pro](https://mkt.hedra.com/models/video/kling/ai-avatar-v2-pro)
- Hedra Character 3 is recommended for locked-camera talking characters. Kling suits more visually active dialogue shots. — [Elser AI (vendor blog)](https://www.elser.ai/blog/best-ai-video-generators-with-lip-sync-in-2026-7-tools-for-talking-and-singing-characters)
- Kling 4.0 reportedly launched 2026-10-15 with 3–30 s clips, and its Motion Control works on human, anime and 3D characters. This comes from a single vendor source. — [Higgsfield](https://higgsfield.ai/blog/best-ai-animation-platforms-2026); Kling advertises anime lip-sync — [Kling](https://kling.ai/explore/anime_video_generation_kling_ai_lip_sync)
- Live2D supports real-time tracking and lip-sync (VTubing). Chibi Live2D rigs with blink, breathing and mouth sync are a common commissioned service. Rigs with 6–8 viseme mouth shapes suit audio-driven lip-sync. VRM avatars run in VSeeFace and similar apps. — [Wikipedia Live2D](https://wikipedia.com/wiki/Live2D), [Fiverr chibi rig](https://fiverr.com/yukiedong/draw-and-rig-your-live2d-chibi-vtuber), [Fiverr VRM](https://www.fiverr.com/s/DBpjxDP)

### Inferences
- For this channel: keep parallax as the default (already proven in cat-2am). For a talking chibi, a cheap test is a Hedra- or Kling-avatar-type tool on one still per episode. A mouth-flap of 3–6 swapped mouth images driven by the volume of `voice.mp3` (a simple ffmpeg/opencv overlay) is deterministic and costs nothing, and it fits a chibi look better than realistic lip-sync, given MuseTalk was rejected on a realistic face.

### Gaps
- No credible source covers AI auto-rigging for Live2D or VRoid (results were Fiverr listings). I found no independent benchmark of lip-sync on cartoon faces.

## Copyright/IP and platform AI labels

### Takeaway
Style itself is generally not protected, and purely AI-generated images aren't copyrightable in the US, so the channel's own chibi host has thin copyright protection. Avoid trademarked names like "Nendoroid" and recognizable existing characters. Label AI content on every platform; it costs nothing.

### Cited Findings
- US Copyright Office, AI Report Part 2 (2025-01-29): works entirely generated by AI are not copyrightable. Only human contributions (creative modification, selection, arrangement) can be protected. Prompts alone are not enough. — [copyright.gov](https://copyright.gov/newsnet/2025/1060.html), [Skadden](https://skadden.com/insights/publications/2025/02/copyright-office-publishes-report), [LoC blog](https://blogs.loc.gov/copyright/2025/02/inside-the-copyright-offices-report-copyright-and-artificial-intelligence-part-2-copyrightability/)
- Copyright Office guidance doesn't bind the USPTO, and trademark is a separate regime. — [Yahoo/fashion](https://www.yahoo.com/news/does-u-copyright-office-guidance-214748440.html)
- NENDOROID is a US registered trademark of Good Smile Company (Reg. 4939118, class 28, registered 2016-04-19). Related marks include NENDOROID EZ and NENDOROID-SERIES. Good Smile says using the name in product titles for sale infringes its trademark. — [Justia](https://trademarks.justia.com/865/42/nendoroid-86542770.html), [trademarkdir](https://trademarkdir.com/trademark/nendoroid-86542770), [Good Smile support](https://support.goodsmile.com/hc/en-us/articles/24397715633177)
- YouTube requires disclosure for realistic altered or synthetic content, but not for clearly unrealistic or animated content. Disclosure doesn't hurt reach or monetization. YouTube can apply labels itself, for example from C2PA metadata, and repeat non-disclosure can lead to penalties. — [YouTube Help](https://support.google.com/youtube/answer/14328491), [YouTube blog](https://blog.youtube/news-and-events/disclosing-ai-generated-content)
- TikTok requires labels on AI content showing realistic scenes or people. It may auto-label detected AI content, and an auto-label can't be removed. — [TikTok newsroom](https://newsroom.tiktok.com/al-literacy-updates?lang=en-ZA), [TechCrunch](https://techcrunch.com/2023/09/19/tiktok-debuts-new-tools-and-technology-to-label-ai-content/)

### Inferences
- A cartoon chibi is technically "non-realistic", but CLAUDE.md says to always tick AI labels anyway. Codex/OpenAI outputs carry C2PA, so platforms may auto-label regardless.
- Using "Nendoroid" inside a private prompt is not using it in commerce, but it risks producing outputs close to the trade dress. It is also pointless because generic phrases ("vinyl figure, oversized head") do the job. Never use the name in titles, captions or hashtags. Don't prompt for named franchise characters.

### Gaps
- Thai law (Thai Copyright Act on AI works) was not researched. I also didn't check Nendoroid registrations in Japan or Thailand, or any case law on chibi trade dress.
