# Student Learn reference implementation

The supplied Learn screenshot defines the composition: illustrated Aralin header, two pill tabs, progress summary, five numbered learning stages, compact module cards, and illustrated introduction/final stages. Module titles, descriptions, types, progress, completion counts and locks come from the authenticated learning-path API. No screenshot progress numbers or preview course records are embedded in the application.

Beginner's stage boundaries follow the reference: 1; 2–6; 7–11; 12–16; 17. The grouping is presentation only and does not modify curriculum or unlock rules. Additional modules remain visible in a further stage. Other reading levels use neutral groups and retain all supplied modules. Decorative syllable labels are derived only from recognized Hanay ng ... module titles; other titles receive a reading illustration without invented syllables. Each recognized syllable family has a picture and visible Filipino example word beginning with that syllable; these labels do not add spoken targets or scoring rules.

The Galing sa Guro tab preserves assigned PDFs, the reading assistant, published drill activities and return-to-list behavior. Query failures have retry controls, and an empty path has an explicit message. Tabs support left/right arrow keys plus Home/End. Compact cards reflow on tablets and phones; explicit OpenDyslexic and large-font preferences are retained.

## Saved artwork

All six new illustration assets were generated with the **built-in image_gen tool**, copied into the repository and consumed by this tab. The alphabet cutout preserves its generated transparency.

- src/assets/students/learn-reference/learn-schoolyard.png
- src/assets/students/learn-reference/introduction-garden.png
- src/assets/students/learn-reference/trophy-garden.png
- src/assets/students/learn-reference/alphabet-blocks.png
- src/assets/students/learn-reference/tagalog-module-icons.png
- src/assets/students/learn-reference/trophy-student.png

The existing home/lesson-books.png, profile/journey-landscape.png and Aking Unang Tagumpay.png book artwork are reused. Baloo 2 is bundled locally from the official Google Fonts repository (Baloo2-Variable.ttf and OFL-Baloo2.txt), licensed under SIL OFL with a distributed copy in public/font-licenses/Baloo2-OFL.txt; it is scoped to default-mode Learn headings and display letters. Explicit OpenDyslexic retains its own font. The sprite sheet supplies fifteen decorative module icons without adding spoken targets. All headings, quote text, tabs, syllables, progress bars, badges and controls are real UI. Artwork is recreated rather than pixel-exact reproduction of the reference.

## Final prompt set

### Header

Use case: illustration-story. Asset type: panoramic header background for a Filipino children's reading Learn tab. FIRST of the last FOUR images is the USER'S new Learn dashboard reference screenshot, the other three are existing project artwork for style only. Recreate the TOP banner's polished vibrant soft 3D cartoon schoolyard illustration very closely, landscape about 4.3:1. At far LEFT a cheerful young Filipino schoolboy with fluffy dark brown hair, huge brown eyes, cream school hoodie with navy backpack, holding an open purple book with one arm and raising his other hand with index finger pointing UP. A small big-eyed purple-and-white owl smiles immediately beside him at lower left. Characters fill leftmost 32 percent and extend from near top to bottom. Bright sunny blue sky and white clouds, leafy green trees framing corners, orange-roofed school at the right, curving grassy path and colorful flowers along foreground, floating golden stars, luminous yellow sun near upper right. Keep center 34%-74% mostly clean PALE SKY for real title and subtitle text rendered by code. No signboard (quote sign rendered by code at far right). Warm vivid friendly colors, premium dimensional storybook children's learning game quality matching screenshot. Full bleed scene, absolutely NO text, letters, labels, numbers, buttons, UI or watermark.

### Introduction garden

Use case: illustration-story. Asset type: panoramic background for the FIRST learning stage card in the user's new Learn screenshot, FIRST of last FOUR images; other images are existing style support only. Very wide landscape 4.3:1. Match the school garden illustration behind Panimula: bright blue sky with soft white clouds, sunny green rounded trees and shrubs, school with orange roof at far right, winding grassy path, white/yellow/pink flowers along bottom corners. In the BOTTOM RIGHT HALF a cheerful Filipino schoolboy with fluffy brown hair, cream hoodie and navy backpack, holding an open purple reading book and pointing one index finger upward, with an adorable big-eyed purple-and-white owl and small colorful books beside him. Character heads start at roughly 30 percent from top, bodies cropped by bottom edge. Leave LEFT 55 percent clean sky and light garden scenery because a real module card will cover it. Keep top 22 percent calm blue sky for real section title. Polished luminous dimensional 3D cartoon art, lively vivid colors matching reference, consistent anatomy, wide garden composition. No UI, no labels, no text, no letters, no signboard, no watermark.

### Trophy garden

Use case: illustration-story. Asset type: wide panoramic background for the FINAL learning stage of the Learn dashboard in FIRST of last FOUR images (user's reference), other images existing style only. Landscape approximately 4.3:1. Sunny joyful garden and schoolyard, pale blue sky, fluffy clouds, warm green trees, orange-roofed school in distance, colorful little flowers and bright green leaves at bottom. At far RIGHT THIRD a smiling Filipino young schoolboy with fluffy dark brown hair, large warm brown eyes, cream hoodie, navy backpack, raising a big polished golden trophy above his head. Adorable purple-and-white owl at his side on far right. Golden stars and sparkles float around trophy. Characters and trophy only occupy RIGHTMOST 35 percent, leave LEFT 65 percent quiet pale sky/green garden for an actual final module card rendered by code, and keep top strip calm for stage heading. Match luminous polished soft 3D cartoon style and vibrant friendly colors of reference. No words, letters, text, labels, buttons, signs or watermark.

### Alphabet blocks

Use case: illustration-story. Asset type: transparent decorative cutout for first reading-module card. Three small glossy soft rounded alphabet toy blocks stacked playfully, matching the FIRST module card in user's Learn reference (FIRST of last FOUR images), other images style only. Bottom left BLUE block with lowercase white 'b', bottom right GOLD/YELLOW block with lowercase green 'c', top PINK block with lowercase white 'a'. The three letters exactly a, b, c. A small golden star above and a couple small green leaves behind. No owl, no boy, no other objects. Polished vivid dimensional 3D cartoon game icon, rounded corners, soft highlights, charming compact portrait composition with clear shapes readable at 75 pixels tall. Genuine transparent background, no backdrop, glow haze, scenery, UI, border or watermark.


### Original module icon sheet (superseded)

Use case: game-asset. Create a reusable TRANSPARENT SPRITE SHEET of exactly FIFTEEN different polished soft 3D cartoon learning icons, organized as a strict regular grid of FIVE COLUMNS and THREE ROWS. Canvas should be wide 5:3 aspect, each of the 15 cells exactly equal square size, each object centered in its cell with generous equal transparent padding and no touching cells. Fill at most 76% of each cell. No dividers/grid lines, no captions, no letters or text. These icons match a colorful Filipino child's reading dashboard: rounded glossy cute dimensional shapes, rich cheerful saturated colors, soft highlights, coherent 3D perspective, clearly readable at 50px. EXACT ORDER from left to right: TOP ROW: 1 colorful red/blue/yellow beach ball; 2 bright yellow rubber duck; 3 small orange wooden acoustic guitar; 4 small cream house with red roof and blue windows; 5 orange smiling kitten face. MIDDLE ROW: 6 three fresh green leaves; 7 ripe golden mango with green leaf; 8 cozy brown bird nest containing three small blue eggs; 9 fluffy pale blue-white cloud; 10 golden bread roll with one pale cut end. BOTTOM ROW: 11 small hot pink portable radio with speaker and antenna; 12 brilliant golden sun with short rounded rays; 13 small red/blue toy drum and two crossed drumsticks; 14 shiny blue water droplet; 15 small white/red sailboat with blue hull. Only these fifteen icons, all complete and fully isolated, consistent scale and spacing, no characters or owls, no school scenery, no shadows extending outside cells, actual transparent background, no watermark. Composition and precise evenly-spaced five-column grid are essential so code can show one icon per cell.

### Trophy student cutout

Use case: illustration-story. Create a TRANSPARENT character cutout for the far-right end of a child's reading dashboard final stage. An adorable young Filipino schoolboy, fluffy dark brown spiky hair, large warm brown eyes, cream school hoodie with blue accents, navy backpack, smiling happily at viewer, shown from waist up. He holds a large golden trophy with star emblem in one hand raised above his head toward the LEFT of the composition. His small adorable purple-and-white big-eyed owl companion sits immediately beside him at lower RIGHT, looking excited. A few small golden stars around the trophy. Composition: compact upright nearly square 1:1 group, trophy is above and to left of boy's head, owl fully visible at lower right, the entire boy, trophy, owl and raised arm inside canvas with some transparent padding. Polished dimensional 3D cartoon game illustration with vivid colors, warm soft highlights, coherent anatomy, appealing friendly faces. Exactly these characters, trophy and tiny stars; no background, no scenery, flowers, books, circle, badge, glow haze or ground. Genuine transparent background, NO letters, numbers, text or watermark. Preserve natural proportions, do not squash faces or trophy. This cutout will sit at 220px by 200px in a website illustration.


## Readability correction

Learn resets inherited body letter/word spacing within the interface so an enabled OpenDyslexic setting does not apply body-sized tracking to small labels. Module descriptions and lock notes have readable minimum font sizes, headings have separate sizing, and the font-size preference still scales the text. Hero and introduction illustrations use separate layers sized to their section height instead of a cover crop across the full wide panel. Validation includes an actual enabled dyslexia setting at 1920px, 1440px and 375px, with the longer introduction description and a completed/unlocked module pair.


### Active Tagalog picture sheet

Saved asset: src/assets/students/learn-reference/tagalog-module-icons.png. Generated with the **built-in image_gen tool**, with transparency preserved. It replaces module-icons.png in the active UI. Every illustration has a visible Filipino word caption and screen-reader context.

| Module syllable | Filipino example | Picture |
| --- | --- | --- |
| Ba | Bahay | House |
| Da | Dahon | Leaf |
| Ga | Gatas | Glass of milk |
| Ha | Halaman | Potted plant |
| Ka | Kamay | Open hand |
| La | Lapis | Pencil |
| Ma | Mata | Eye |
| Na | Nanay | Mother hugging a child |
| Nga | Ngayon | Calendar with the current day highlighted |
| Pa | Payong | Umbrella |
| Ra | Radyo | Radio |
| Sa | Saging | Bananas |
| Ta | Tasa | Cup |
| Wa | Walis | Walis tambo |
| Ya | Yaman | Treasure chest |

The captions are picture examples for the syllable families. They do not replace the student's actual curriculum items or modify pronunciation scoring, rewards, progress or module unlocks. Other curriculum titles do not receive an invented word example.

Final generation prompt:

Use case: game-asset. Asset type: a transparent illustrated icon sprite sheet for a Filipino / Tagalog early-reading learning app. Create EXACTLY FIFTEEN polished 3D cartoon pictures in a strict uniform FIVE-COLUMN, THREE-ROW grid, canvas wide 5:3 aspect. Each of the 15 equal square cells has ONE picture centered within the MIDDLE 70% of the cell, with at least 15% fully transparent padding on ALL FOUR sides. No object may cross its cell or touch another cell. No grid lines or frames. Friendly vivid rounded 3D storybook educational style, soft warm highlights, consistent scale, coherent anatomy and clear silhouettes, readable when reduced to 60px. The objects must illustrate these TAGALOG words, so their identity is essential. Exact order left to right: TOP ROW: 1 BAHAY = a small Filipino family house, cream walls, red roof, blue windows; 2 DAHON = ONE simple bright fresh green leaf; 3 GATAS = a clear glass filled with white milk (no carton text, no cow); 4 HALAMAN = a healthy small green leafy plant growing in a terracotta pot; 5 KAMAY = one warm medium-tan human hand showing an open palm, five clearly separated natural fingers, simple friendly cartoon hand. MIDDLE ROW: 6 LAPIS = one yellow pencil with pink eraser, diagonally placed; 7 MATA = one large friendly brown human eye with soft eyebrow, no whole face; 8 NANAY = a loving Filipino mother with dark hair gently hugging her young child, compact portrait group, fully inside the cell; 9 NGAYON = a simple little calendar page with a 3x3 grid of blank squares, ONE square highlighted blue with a tiny golden sun symbol indicating TODAY, no dates, numbers, letters or written words; 10 PAYONG = a colorful open umbrella with a curved handle. BOTTOM ROW: 11 RADYO = a small pink portable radio with antenna and speaker; 12 SAGING = a small bunch of ripe yellow bananas; 13 TASA = a simple blue and white ceramic cup with ONE handle (no saucer needed); 14 WALIS = a Filipino WALIS TAMBO soft fan broom: long slim light wooden handle and wide fan-shaped golden-brown soft grass bristles at bottom (NOT a household cleaning brush or witch broom); 15 YAMAN = a small open wooden treasure chest filled with bright golden coins. These fifteen objects must follow this exact order and strict grid. Genuine transparent background throughout including padding, no backdrop, ground, scenery, frame, decorative stars outside objects, or glow haze. Absolutely NO text, letters, numbers, English captions, Tagalog captions, UI or watermark anywhere; all word labels will be rendered in code.


The active 1619 × 972 sheet is displayed using an individual SVG viewBox around each picture, preserving the original PNG and transparency. This prevents neighboring objects from appearing in another word's card.
