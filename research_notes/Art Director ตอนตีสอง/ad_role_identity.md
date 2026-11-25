# Art Director role and visual identity for a faceless / AI-assisted short-form channel (ตอนตีสอง)

Context: Thai channel ตอนตีสอง (2 a.m. thoughts; quiet, late-night, honest; dim-light visuals). Series: love-quotes, work-talk, living-life (image mode, 9:16, 20-90s), night-stories (16:9 long-form), cat-2am (2D cartoon, cat ส้มฉุน). Assets are AI-made (Codex images, ElevenLabs voice, parallax motion, HyperFrames overlays) — so the "AD" is largely a rules-and-review function rather than a crew manager. Source quality note: nearly all web sources found are vendor/agency blogs and job postings; the YouTube official blog is the only first-party creator source. Treat specifics as common practice, not standards.

## What are an AD's core responsibilities and deliverables in social video / content studios?

### Takeaway
An AD owns the visual direction and the rulebook (style guide), writes concept briefs for each piece, keeps platform specs current, and reviews output for on-brand quality; in video work this extends to storyboards and shot lists and to how motion supports the brand.

### Cited Findings
- AD leads a team directing visual elements across film/TV, campaigns, social media videos, ads — [Built In](https://builtin.com/job-descriptions/art-director-job-description)
- ADs create style guides used by artists, designers and filmmakers — [Indeed](https://ca.indeed.com/hire/job-description/art-director)
- For video, the AD manages production timelines, storyboards, shot lists, breakdowns, call sheets, and must go beyond colour/branding to how moving images contribute to the presentation — [StudioBinder](https://www.studiobinder.com/blog/art-director-job-description/)
- Social AD postings list "championing the social media style guide and visual identity" and producing social-first content — [Built In NYC posting](https://www.builtinnyc.com/job/art-director-social/9934464); [Mediabistro / Monks](https://www.mediabistro.com/jobs/1656176748-senior-art-director-social-content)
- Social AD duties: set each post's intention (tied to goal), set tone per channel, write concepts for designers and present them before production, decide which trends fit the brand, know and communicate platform specs — [ManyPixels](https://www.manypixels.co/blog/social-media-design/art-direction)
- Deliverables named there: mood board, concept brief (purpose + intended result of each visual), technical guidelines (sizes, durations, aspect ratios per platform), social brand guide (colours, fonts, personas; current identity + planned direction) — [ManyPixels](https://www.manypixels.co/blog/social-media-design/art-direction)

### Inferences
- For ตอนตีสอง the AD deliverables map onto existing repo artifacts: brand guide -> a channel-level style bible above each `series.md`; concept brief -> `episode.json` `image_style`/`image_prompt` + `script.md`; tech guidelines -> render specs in CLAUDE.md; mood board -> reference images in `shared/characters/*/reference` and looks.
- With AI generation, the AD's leverage is in locked prompt rules (`image_rules`, `image_style`, `image_refs`) and review gates (the web review stages script -> images -> voice -> render), not crew management.
- "Which trends to skip" matters: trends that break the quiet late-night tone (loud transitions, bright colours) should be rejected by default.

### Gaps
- No source specifically describes an AD role on a faceless/AI-only channel; mapping above is inferred.
- No Thai-market AD job descriptions were checked.

## What goes into a visual style guide / brand bible for a video channel?

### Takeaway
Common contents: limited palette with hex codes (about 1 dominant + 2 accents), two fonts (display + supporting), imagery/render style, logo/watermark position, reusable motion templates (intro/outro, lower thirds, end screens, transitions), thumbnail template with locked vs. swappable layers, platform specs and safe zones, and for AI channels a character bible with references attached to every generation.

### Cited Findings
- Max three colours, ~70/15/15 split (one dominant, two accents), stored as hex, tested on light and dark backgrounds — [Pixflow](https://pixflow.net/blog/youtube-channel-branding/)
- Two fonts: bold readable display font for titles/thumbnails + simpler companion for lower thirds/end screens — [Pixflow](https://pixflow.net/blog/youtube-channel-branding/)
- Branded intro 3-5 s max (longer hurts retention); reusable motion templates for intros, end screens, transitions, lower thirds — [Pixflow](https://pixflow.net/blog/youtube-channel-branding/)
- Thumbnails: locked brand layers (fonts, grading, layout, logo position), swap subject/expression; one idea, ~3 words; must read at 160x90 px — [Pixflow](https://pixflow.net/blog/youtube-channel-branding/)
- Five consistency elements: logo, colour, typography, imagery, consistency itself — [ManyPixels](https://www.manypixels.co/blog/brand-design/branding-your-youtube-channel)
- Thumbnails need not be identical but should share a consistent style — [Jeff Bullas](https://www.jeffbullas.com/thread/what-are-the-key-elements-of-good-youtube-channel-branding/)
- AI character bible: name, role, visual identity, voice, render style, signature colours, must-keep features, "avoid" rules; build it before generating; multi-angle character sheets; attach references to every prompt; text prompts alone drift — [Overseeros](https://www.overseeros.com/blog/ai-character-bible-faceless-youtube); [invideo](https://invideo.io/faq/how-do-you-create-a-character-bible-for-ai-video-to-lock/); [Artlist](https://artlist.io/blog/consistent-character-ai/)
- Switching render style between episodes damages channel identity as much as character drift — summarised from search results incl. [invideo](https://invideo.io/faq/how-do-you-create-an-ai-video-series-with-consistent/) (vendor; unverified)
- Safe zones: TikTok publishes no pixel-exact spec — [ManyChat](https://manychat.com/blog/tiktok-video-size-guide/). Figures for 1080x1920 conflict: Revid ~220 px top / 480 bottom / 60 left / 140 right — [Revid](https://www.revid.ai/tiktok-safe-zone); Ignite 108 top / 320 bottom / 60 left / 120 right — [Ignite](https://www.ignitesocialmedia.com/content-creation/what-are-the-safe-zones-for-tiktoks-and-instagram-reels/); a "universal" ~900x1400 central zone across TikTok/IG/YT — [VidPros](https://vidpros.com/vertical-video-safe-zone/). Longer captions shrink the zone — [Litcommerce PDF](https://litcommerce.com/wp-content/uploads/2025/04/TikTok-Safe-Zone-Templates.pdf)

### Inferences
- A ตอนตีสอง bible should specify: palette (e.g. deep navy/near-black dominant, warm lamp amber accent — the existing gold word highlight — plus one cool accent), lighting rule (single practical light source, low key, no daylight), grain/vignette level, framing (subject inside the conservative ~900x1400 centre zone; subtitles above the bottom ~320-480 px), motion (slow parallax only, hard cuts, no flashy transitions), typography (IBM Plex Sans Thai SemiBold for subtitles; one display font for hook text/covers), end card ("ตอนตีสอง" card from HyperFrames, keep under ~3 s), watermark/handle position, and an "avoid" list (bright saturated colours, stock-smile faces, busy text).
- Use the most conservative safe-zone numbers since the same clip goes to TikTok, Reels and Shorts.
- Host ใบเตย and cat ส้มฉุน each need a character bible (some exists in `persona.md` / `series.md`); key is always attaching the reference sheet (`image_refs`).

### Gaps
- No primary platform (TikTok/Meta/YouTube) official safe-zone pixel specs were retrieved; numbers above are third-party and disagree.
- No published brand bible of a comparable mood/quote channel was found to use as a concrete example.

## How do channels keep a recognizable look across multiple series yet differentiate each series?

### Takeaway
Hold a fixed channel "frame" (fonts, grading, logo/end card, layout logic, naming pattern) and vary a small, deliberate set of per-series markers (accent colour or badge, title format, opening device, music); YouTube's own guidance stresses consistent titles, a repeated opening device, and series playlists.

### Cited Findings
- YouTube tips: consistent titles/tags (Rhett & Link "Ep.# (Feat. Guest)"), consistent opening branding (Tastemade "Thirsty For..." title over each drink; each video can have its own typeface and music but the repeated format binds the series), announce schedule in series name (Tip Tuesday), ordered playlists per show (Crash Course) — [YouTube Official Blog](https://blog.youtube/creator-and-artist-stories/four-tips-for-branding-your-series-on)
- Give each recurring series its own accent colour or badge within the overall system; one master thumbnail template with locked brand layers — [Pixflow](https://pixflow.net/blog/youtube-channel-branding/)
- Audit brand monthly; cross-platform check quarterly; change one variable at a time and wait ~1 month of data — [Pixflow](https://pixflow.net/blog/youtube-channel-branding/)
- Tools for multi-channel faceless studios store characters, style and format rules per channel/project so later episodes reuse them — [invideo](https://invideo.io/faq/how-do-you-manage-multiple-faceless-youtube-channels/); [Higgsfield](https://higgsfield.ai/blog/start-faceless-channel-with-ai) (vendor claims)

### Inferences
- Channel constants for ตอนตีสอง: night palette + low-key light, subtitle font/style and gold highlight, "ตอนตีสอง" end card, quiet voice/music level, playlist naming `ตอนตีสอง · เรื่อง<topic>`.
- Per-series variables (one or two each): love-quotes = warm rose/amber accent, intimate close shots; work-talk = cool fluorescent/monitor-glow accent, desk/office-at-night settings; living-life = muted neutral, empty-room/window shots; night-stories = 16:9 storybook warmth, chapter cards; cat-2am = 2D cartoon (already its own render style via `image_rules`) but kept in the same night palette and end card so it still reads as the channel.
- A small series badge/tag on the cover frame or a consistent title prefix helps viewers recognise the series in a feed.

### Gaps
- No case study with data showing per-series differentiation improving metrics in short-form specifically.

## What review/QA checklists do ADs use before publishing?

### Takeaway
Practice is multi-gate QA (brand pass early, not only at the end), platform-spec and in-app preview checks, audio/pronunciation checks, hook check in the first line/seconds, and for AI content extra checks on artefacts and disclosure.

### Cited Findings
- Brand check before stakeholder review is the most valuable gate (catches off-brand elements, wrong titles); QA at several gates — [Shootsta](https://shootsta.com/blog/video-editing-qa-guide)
- Check per-platform format specs — [Typito](https://typito.com/blog/social-media-video-checklist/)
- Watch the uploaded preview inside the platform UI; edit from highest-quality source — [Postly](https://blog.postly.ai/a-pre-publish-quality-checklist-for-youtube-content/)
- "10-second gut check"; does the first caption line have a hook — [Georgia Tech brand](https://brand.gatech.edu/our-voice/social-media-checklist)
- Route assets through brand/legal review and answer each comment in writing — [Manifest.ly](https://app.manifest.ly/public/checklists/social-media-checklist)
- Confirm video is final before publishing; finish review before captions — [UC ANR](https://www.ucanr.edu/dept/communications-toolkit/quality-assurance)
- AI-video-specific pre-publish checks exist (article, not fetched in full) — [PC Tech Mag](https://pctechmag.com/2026/07/what-creators-should-check-before-publishing-an-ai-generated-video/)

### Inferences
- Suggested ตอนตีสอง AD checklist (per review stage in the web): images — palette/lighting matches bible, same character face/look, no AI artefacts (hands, Thai text garbled in image), subject in safe zone; voice — Thai pronunciation, calm pace, voice above music; render — hook visible by 1.5 s, visual change every 3-5 s, subtitles readable on phone and above bottom UI, end card present, length within series limit; publish — AI label ticked, cover text on-brand, playlist name pattern correct; watch once on a phone.
- These overlap with the repo's `story-hook-framework` and `vertical-edit-techniques` skills; an AD checklist should add the brand/palette/consistency items those skills lack.

### Gaps
- Advids 50-point QC checklist content not retrieved (only header).
- No sourced AD review checklist specific to faceless AI channels.
