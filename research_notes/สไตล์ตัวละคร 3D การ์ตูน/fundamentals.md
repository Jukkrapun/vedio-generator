# 3D Cartoon (Stylized 3D) Art Style and Character Design Fundamentals

## Sub-styles of stylized 3D

### Takeaway
The family runs from physically based "feature" looks (Pixar/Disney/DreamWorks/Illumination), which bend physical rules on purpose, to NPR/toon looks (Spider-Verse, Arcane, Guilty Gear Xrd) that paint over 3D, hand-place shadows and use cel shaders so the image reads as 2D.

### Cited Findings
- Pixar stylizes through silhouettes and set design (Bing Bong in *Inside Out*, *Day & Night*). OpenSubdiv smooth surfaces are "a critical part of representing cartoony looks". Artists mix material lobes to break physics (the "impossibly gummy fish" in *Finding Dory*, the ethereal beings in *Soul*) — [RenderMan: Stylization at Pixar](https://renderman.pixar.com/stories/stylization-at-pixar)
- In *Luca*, shadows were tinted and art-directed to match the concept art using a "Shadow Fringe" light filter (sharpness, penumbra, colour). In *Sanjay's Super Team*, the shadow terminator was given a sudden falloff to mimic 2D — [RenderMan](https://renderman.pixar.com/stories/stylization-at-pixar)
- A Pixar paper notes a recent trend toward "graphic shape language in facial expressions", and Pixar has built a pipeline for detached facial features (eyes/mouth as separate graphic elements) — [Pixar DFF paper](https://graphics.pixar.com/library/DFF/paper.pdf), [Eyes Without a Face](https://graphics.pixar.com/library/DFF)
- Spider-Verse: Sony Imageworks reinvented look dev, lighting and texturing to fit the comic origins, built compositing nodes that apply painterly effects to 3D renders as a post-process, and ran a separate pipeline for hand-animated linework — [SIGGRAPH: NPR compositing of the Spider-Verse](https://history.siggraph.org/learning/non-photorealistic-compositing-of-the-spider-verse-by-davignon-and-st-clair/), [SIGGRAPH: Linework in Across the Spider-Verse](https://history.siggraph.org/learning/linework-in-spider-man-across-the-spider-verse-by-grochola-maccari-lee-and-boulet-gilly), [Cartoon Brew](https://www.cartoonbrew.com/feature-film/if-its-not-broke-break-it-sony-imageworks-renegade-approach-to-spider-man-into-the-spider-verse-167321.html)
- *Across the Spider-Verse* has six worlds, each in its own animation style — [Foundry](https://foundry.com/insights/film-tv/across-the-spider-verse-nuke-mari-katana)
- Arcane (Fortiche): 3D models with painted textures, artist-placed shadows and highlights, hand-drawn 2D FX (smoke, fire, sparks) composited on top, and 2D backgrounds projected onto simple geometry. Tools: Maya, Photoshop, Nuke, After Effects. Season 2 added watercolour and charcoal styles — [Where Creativity Works](https://wherecreativityworks.com/arcane-the-blurring-of-2d-and-3d/), [Creative Bloq](https://www.creativebloq.com/art/2d-animation/how-the-creative-team-behind-netflixs-arcane-pushed-the-animation-even-further-for-the-second-season), [VFX Voice](https://vfxvoice.com/riot-games-and-fortiche-get-revolutionary-with-arcane-season-2/), [80.lv backgrounds](https://80.lv/articles/arcane-artists-show-how-they-combine-traditional-art-3d-for-backgrounds)
- Guilty Gear Xrd (GDC 2015, Junya C. Motomura): the team weighed vector art and high-res sprites before choosing cel-shaded 3D built strictly on anime conventions, with custom cel shaders and models made for those shaders. In cel shading a surface is either lit or not, so small normal errors show up as large blotches and normals must be hand-tuned — [GDC Vault](https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The), [Motomura slides PDF](https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf), [Game Developer](https://gamedeveloper.com/art/see-i-guilty-gear-xrd-i-s-striking-2d-3d-art-deconstructed-at-gdc-2015)
- Guilty Gear Xrd: each character had its own light source that affected only that character's body. This comes from a third-party summary and is not fully verified — [Arc System Works blog](https://www.arcsystemworks.com/guilty-gear-xrd-art-talk-at-game-developers-conference-2015/)
- Illumination mostly reuses its character designs and proportions across films and redoes the modelling and texturing for each new pipeline — [CGW](https://www.cgw.com/Press-Center/Web-Exclusives/2017/Yin-and-Yang.aspx)
- DreamWorks' *The Bad Guys 2* built a stylized base across rendering, FX, animation and character design, mixing 2D and 3D FX — [befores & afters](https://beforesandafters.com/2025/11/18/how-the-bad-guys-2-filmmakers-approached-stylization-and-combining-2d-and-3d-fx)
- Pop Mart blind-box style is described as a mix of pop art, fantasy and street culture, made as vinyl figures. Academic work frames the wider category as a "pastel-kawaii" aesthetic of simple shapes, cuteness and positive emotion — [Pop Mart designers](https://au.popmart.com/pages/our-designers), [KNUTD paper](https://er.knutd.edu.ua/bitstream/123456789/32886/1/271-276-%d0%a21-%d0%9f2-%d0%9f%d0%b5%d1%82%d0%bb%d0%b5%d0%bd%d0%ba%d0%be%2b%d0%84%d0%b6%d0%be%d0%b2%d0%b0.pdf), [Atlantis Press ADDT 2025](https://www.atlantis-press.com/proceedings/addt-25/126014879)

### Inferences
- I see two axes: how physical the rendering is (PBR feature look vs. NPR/painted) and how far proportions are pushed (Illumination and blind-box most, Pixar more restrained).
- The vinyl-toy look likely means a semi-gloss single material, chunky simple forms and soft studio lighting. This is drawn from the vinyl material, not from a sourced render breakdown.

### Gaps
- I found no authoritative sources on claymation-look 3D (e.g. fingerprint textures, stepped/"on twos" animation), low-poly, or the Animal Crossing/Nintendo cute 3D look.
- I found no reliable side-by-side comparison of DreamWorks, Illumination and Pixar. A studio blog claims Pixar keeps exaggeration controlled while DreamWorks pushes it further ([Prolific](https://prolificstudio.co/blog/exaggeration-in-animation/)), but it cites no evidence.

## Shape language, proportions, face, materials, hair

### Takeaway
Stylized characters get their appeal from exaggerated proportions, especially large eyes, and from graphic shape language. Research finds the materials matter at least as much as the shapes: realistic skin on a cartoon face lowers appeal.

### Cited Findings
- Stylization lets artists exceed real-world proportions, such as oversized eyes, to increase appeal and expressiveness. A perceptual study found that appeal depends mainly on material stylization rather than shape, and that realistic materials tend to reduce appeal — [TU Dortmund 2015 stylization study](https://ls7-gv.cs.tu-dortmund.de/publications/2015-stylize.pdf)
- A Pixar technical memo ("Articulating Appeal") says the ratio of visible teeth to gums strongly affects how appealing a mouth looks, which matters for mouth rig design — [Pixar](https://graphics.pixar.com/library/ArticulatingAppeal/paper.pdf)
- Pixar cites getting subsurface scattering right on the face as key. The early *Toy Story* humans had none — [Yahoo/Pixar tech evolution](https://sg.news.yahoo.com/inside-pixars-technological-evolution-from-toy-204900060.html)
- Pixar has a dedicated paper on character shading for *Elio* — [Pixar](https://graphics.pixar.com/library/ElioCharsShading/paper.pdf)
- Hair as sculpted shapes: artists block hair as large basic clumps and then refine them ([80.lv Azula](https://80.lv/articles/recreating-azula-in-3d-in-zbrush-and-substance-painter)), use Curve Tube brushes ([80.lv Koi girl](https://80.lv/articles/breakdown-3d-girl-with-koi-fish-tattoo/)), and add a few strands to break up the silhouette ([80.lv female knight](https://80.lv/articles/creating-enchanting-stylized-female-knight-using-zbrush-blender)). Blender Studio warns that curve-based clumps look rigid unless they are layered and varied in flow, width and thickness — [Blender Studio](https://studio.blender.org/training/stylized-character-workflow/)
- Sprite Fright (Blender Studio) discusses "the illusion of simplicity" in stylized design — [Blender Studio blog](https://studio.blender.org/blog/sprite-fright-the-illusion-of-simplicity)

### Inferences
- In practice: keep skin soft and matte with subsurface, and keep it simpler than real skin (no pores). Eyes can be glossier. A stylized face needs a mouth rig with readable graphic shapes and controlled tooth display.

### Gaps
- I found no sourced numeric proportion rules, such as head-to-body ratios per studio or eye size as a percentage of the face.

## Lighting and color, including night/dim moody 3D

### Takeaway
Stylized lighting is art-directed: a key light plus coloured rim lights to separate the silhouette, tinted and controlled shadows, and a colour script per film. *Soul*'s Earth scenes use natural, single-source, cinematographic lighting.

### Cited Findings
- *Soul* brought in cinematographer Bradford Young as a lighting consultant. Its human world uses natural, single-source lighting, which contrasts with the abstract, hue-driven glow of the soul world (built with volume rendering) — [Digital Trends](https://digitaltrends.com/movies/pixar-soul-directors-interview-music-disney-plus-pete-docter-kemp-powers), [No Film School](https://nofilmschool.com/fake-real-lighting-pixars-soul), [VES/Issuu](https://issuu.com/visualeffectssociety/docs/winter21flip0126_smaller/s/11634689), [RenderMan: Cinematography with Soul](https://renderman.pixar.com/stories/cinematography-with-soul)
- *Soul* has a SIGGRAPH 2021 talk on lighting skin tones correctly — [Laughing Place](https://laughingplace.com/w/p/soul-guide/siggraph-2021-pixar-talks-about-the-technical-side-of-lighting-skin-tones-in-soul)
- In *Soul*, the school reads as a cool fluorescent wash while the jazz club is lit warm and richly textured, so lighting carries the mood of each location — [Color Culture](https://colorculture.org/?p=7390)
- Pixar paints a colour script for each film to set the tone scene by scene — [No Film School](https://nofilmschool.com/how-do-you-light-animated-film)
- An 80.lv lighting breakdown of a *Soul* scene — [80.lv](https://80.lv/articles/lighting-artist-breaks-down-disney-pixar-s-soul-scene)
- Common stylized-character lighting: a key light, fill where the key misses, and several rim lights. One artist avoids a single directional light as "too heavy-handed" ([80.lv Jade](https://80.lv/articles/001agt-002mrs-004adk-capturing-the-mood-of-the-concept-in-3d)). Others use a main light with three rim lights ([80.lv](https://80.lv/articles/breakdown-3d-girl-with-koi-fish-tattoo/)), yellow and blue rim lights to define the silhouette in an Arcane-style piece ([80.lv Link](https://80.lv/articles/how-to-make-a-reimagination-of-zelda-s-link-with-the-iconic-arcane-style)), or a warm rim against cool fire light ([80.lv Azula](https://80.lv/articles/recreating-azula-in-3d-in-zbrush-and-substance-painter))

### Inferences
- A recipe for dim, late-night scenes: one motivated practical source (lamp, phone screen, window), a complementary-coloured rim to hold the silhouette in the dark, tinted rather than black shadows, and the face always kept readable.

### Gaps
- I found no specific sourced breakdown of *Inside Out*'s night scenes or of *Soul*'s New York night sequences. I found no ambient occlusion guidance specific to stylized 3D.

## Common mistakes and best practices

### Takeaway
The eyes are the main failure point. Mismatched realism, such as realistic eye or skin texture on a cartoon shape, triggers eeriness. Medium stylization, kept consistent, is the safest choice.

### Cited Findings
- Mismatched size and texture between the eyes and the face is especially likely to make a character eerie — [Scientific Reports / PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5362933)
- With highly realistic characters, viewers fixate on the eyes and mouth, and these areas drive the uncanny response — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4264966)
- An EEG study found stronger reactions to both the most abstract and the most realistic faces than to medium-stylized ones. It also notes that the uncanny valley still lacks solid empirical support — [De Gruyter i-com](https://www.degruyterbrill.com/document/doi/10.1515/icom-2016-0001/html)
- Cartoon shapes combined with realistic skin textures were rated differently from other shape and material combinations (2023 stylized 3D character study) — [Eurographics EGVE 2023](https://diglib7.eg.org/bitstream/handle/10.2312/egve20231314/063-071.pdf)
- Eyes, expressions and mouth movement account for a disproportionate share of the uncanny effect — [Unity glossary](https://unity.com/en/glossary/uncanny-valley)

### Inferences
- To keep a character recognizable: hold the silhouette, signature colours, hair shape and eye design fixed across images, since silhouette is the first thing Pixar designs ([RenderMan](https://renderman.pixar.com/stories/stylization-at-pixar)). For this channel's AI image workflow, that means a fixed character sheet reference (as already done for ส้มฉุน via `image_refs`).
- I assume the "plastic look" comes from uniform glossy specular plus no subsurface, given the findings that subsurface and material stylization drive appeal. I did not find this tested directly.

### Gaps
- I found no studies directly on "dead eyes" or the "plastic look". The remedies (eye catchlights, wet-looking eye surface, eyelid motion) are common industry wisdom I could not source.
