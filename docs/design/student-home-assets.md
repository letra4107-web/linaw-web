# Student home reference implementation

The supplied Home screenshot is the layout reference: illustrated school welcome, five pastel stats, a three-row daily task card beside an encouragement illustration, a woodland word card with wooden controls and a central word board, then lesson progress and reminders. Layout is responsive; the encouragement illustration is decorative and omitted in the narrow layout.

Actual name and grade come from the authenticated student's children row. XP, streak and longest streak come from child_progress. Completed lessons and the next lesson/progress come from the official /student/learn/path response. Assigned work with deadlines remains visible below the reference sections whenever present. No screenshot numbers or preview student details are embedded in the app.

The daily panel uses three working steps of the existing daily word flow: listen, read, speak. Listening completes when audio ends; reading is acknowledged by the reading control; final completion comes only from the server's word-of-day record. The first two are session presentation state, not reward claims or permanent learning progress. An already completed daily word displays all three steps completed on refresh. Actual recording, scoring, XP, attempt limits and feedback use the existing speech/server flow. The site font and Profile design stay separate, and explicit OpenDyslexic/large-font preferences are honored.

## Saved artwork

Generated using the **built-in image_gen tool**. These repository assets are consumed directly by Home CSS:

- src/assets/students/home/welcome-schoolyard.png
- src/assets/students/home/encouragement.png
- src/assets/students/home/word-woodland.png
- src/assets/students/home/lesson-books.png

The transparent lesson-books.png cutout decorates the lesson and daily task cards. All greeting text, quotations, numbers, buttons, word/syllables and labels are rendered in code, not baked into artwork. Artwork is a recreation; it is not a pixel-exact copy of the supplied illustration.

## Final prompt set

### Welcome schoolyard

Use case: illustration-story. Create a wide panoramic website hero BACKGROUND ASSET, approximately 3.15:1. Reference image FIRST of the five recent conversation images is the user's HOME dashboard screenshot; other images are existing project assets for character/style only. Match the top banner's vivid polished 3D storybook cartoon illustration and composition closely. Large friendly Filipino schoolboy with fluffy dark brown hair, huge warm brown eyes, cream hoodie with blue accents and navy backpack, smiling, raising one fist in celebration, is at the FAR LEFT, from waist up, occupying the left 28 percent; small adorable purple-and-white owl peeks beside him at bottom left. Bright blue sky, fluffy white clouds, sunny leafy trees framing both upper corners, green garden and winding path, cheerful orange-and-blue school building at far right. Keep the middle 32%-72% mostly CLEAN PALE SKY with room for real greeting text and a real button overlaid by code. Keep far-right lower area garden/school scenery: the quote board will be rendered separately in code. Warm luminous joyful colors, detailed soft dimensional shading, beautiful friendly mobile learning game quality. Full bleed landscape, no UI, absolutely NO text, letters, buttons, borders, watermark or signs.

### Encouragement

Use case: illustration-story. Create a tall portrait illustration BACKGROUND ASSET, approximately 0.76:1 for the encouragement card in the FIRST of the five recent images (user's HOME screenshot); remaining images are existing app style only. Match the portrait card on the RIGHT of daily tasks: luminous peach/gold background, rounded cartoon polished 3D children's learning art, smiling young Filipino boy with fluffy dark brown hair and huge brown eyes, white hoodie with blue trim, navy backpack, giving thumbs up, smiling with one eye winking. Adorable big-eyed purple-and-white owl beside him on right. Characters fill middle, small sparkling gold stars around. At bottom 28 percent a large blank warm-cream rectangular sign with thick rounded honey-colored wooden frame, angled just slightly counterclockwise; characters overlap its TOP edge but leave the cream center completely blank for real text. Flowers, lush green leaves and colorful book edges along bottom corners. Keep top 12 percent calm pale gold room for title in code. Beautiful friendly eye-catching art with coherent anatomy. Full bleed scene, no UI, NO words, letters, watermark or text anywhere; blank sign.

### Word woodland

Use case: illustration-story. Create a wide landscape website learning-card BACKGROUND ASSET, about 2.45:1. Reference image FIRST of the five recent conversation images is user's HOME dashboard screenshot; other images existing website style. Match the Salita Ngayon scene near bottom: vivid blue sky with fluffy clouds; large lush leafy trees frame LEFT and RIGHT edges; luminous green forest garden, distant rolling hills, tiny colorful flowers. At far RIGHT bottom, an extremely cute purple-and-white owl with enormous amber brown eyes, yellow beak and feet, perched on a wooden tree stump, occupies rightmost 20 percent and bottom 48 percent. Leave top 15 percent blue pale sky for heading, leave entire middle 29%-74% as light peaceful SKY for a real wooden word board overlay, and leave left 8%-27% quiet green-blue backdrop for three real wooden buttons. Keep owl entirely outside central board area. Polished dimensional 3D cartoon children's educational art matching screenshot, warm sunlight, brilliant clear colors, balanced scene. No word board or central sign drawn (will be rendered in code). No UI, NO text, letters, buttons, numbers, watermark, speech bubbles.


### Lesson books

Use case: illustration-story. Asset type: transparent cutout for the lower-right corner of a Filipino children's reading dashboard. A small appealing stack of five colorful schoolbooks, bottom book bright red/orange, then blue, yellow, purple and green, warm cream page edges, subtle gold bookmarks, a small bright green graduation cap resting on top. Three-quarter view with visible spines and layered page edges, tidy slightly staggered stack. Premium polished 3D cartoon game illustration, vivid friendly colors, soft highlights, compact portrait composition, coherent perspective. Exactly a stack of books and cap, no characters, no face, no owl, no scenery, no pedestal. Fully transparent background including around the edges, no colored backdrop, no glow haze, no text or letters, no UI or watermark. Fill most of square canvas.
