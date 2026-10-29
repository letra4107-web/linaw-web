# Student profile reference implementation

The Profile tab follows the supplied screenshot: schoolyard hero, six pastel stat cards, a reading-insights card beside voice speed and a journey map, and five earned-badge cards. The existing sidebar remains, with its reference width scoped to this tab.

Student information is loaded from the signed-in student's `children` and `child_progress` rows, `/student/reading-profile`, and `/student/learn/path`. Badge dates come from award records; missing dates are omitted. The illustrations contain no profile information or sample statistics. Empty and failed requests have separate states.

The reference's rounded UI lettering is scoped to this Profile tab. An explicitly enabled dyslexia font keeps OpenDyslexic and permits cards to expand. The site's Comic Sans default and student-to-login font handling remain separate.

The name editor calls `PATCH /student/profile`. This endpoint derives the student from the authenticated account and permits only a name change; grade, username, ownership and rewards cannot be changed through it.

## Saved artwork

Generated with the **built-in image_gen tool**, not the CLI. Original PNG transparency is preserved for both character cutouts. The existing owl and earned-badge images are reused from the project.

- `src/assets/students/profile/waving-student.png`
- `src/assets/students/profile/listening-student.png`
- `src/assets/students/profile/school-landscape.png`
- `src/assets/students/profile/journey-landscape.png`

## Final prompt set

### Waving student

Use case: illustration-story. Asset type: transparent character cutout for a Filipino child's student profile webpage. Input images: FIRST image is the user's full-page reference screenshot; the other images are existing website illustrations for style only. Match the waving boy at the FAR LEFT of the top banner in the FIRST image extremely closely: cheerful young Filipino schoolboy, huge warm brown eyes, soft rounded cheeks, expressive thick dark eyebrows, fluffy dark brown spiky hair, beige cream school shirt with green backpack straps, holding a purple notebook/tablet against his chest, his right hand up in an open-palmed wave on the LEFT side of the composition. Premium polished 3D cartoon educational illustration with warm bright colors, smooth rounded forms and soft highlights. Show from hair to waist, hand fully visible, boy occupies nearly the whole portrait canvas. Preserve the exact friendly face, outfit, colors and waving pose in the reference screenshot. No text, no UI, no scenery, no frame. Genuine transparent background. This is one standalone reusable cutout, NOT a webpage mockup.

### Listening student

Use case: illustration-story. Asset type: transparent character cutout for voice-speed card. Input images: FIRST image is user's full-page reference screenshot; other images are style context. Recreate the HAPPY BOY WITH BLUE HEADPHONES AND AN OPEN BOOK at the RIGHT of the voice-speed card in the FIRST image, closely matching his face, fluffy spiky dark brown hair, closed happy crescent eyes, wide open joyful smile, creamy beige school shirt, large bright sky blue headphones with dark blue trim, holding an open blue and white book. Premium polished playful 3D cartoon schoolboy, same style and character as the reference screenshot. Half-body portrait, full hair and headphones visible, a few small cyan curved sound lines beside him, cleanly isolated. NO girl, no purple headphones, no yellow shirt, no UI, no text, no scenery or card. Genuine transparent background. This is one standalone cutout, NOT a website screenshot.

### School landscape

Use case: illustration-story. Asset type: wide landscape background for a student profile header and journey card. FIRST reference image is a full-page screenshot. Recreate ONLY the green schoolyard landscape behind the boy and title in its TOP HEADER, closely matching that scene: panoramic bright cyan-blue sky with pillowy clouds, stylized round lime/sage/teal trees, sunny rolling grassy hills, small rounded orange-roof cream schoolhouse at far RIGHT near a big leafy tree, soft yellow winding footpath along the bottom, warm buttery sunlight and a simple small yellow sun high on the right half. Premium smooth polished 3D cartoon children's learning world, friendly clean illustration, no excessive detail. Left to center should be open sky and softly distant greenery for overlaying a separate boy cutout and live title. Wide banner composition at least 3:1 aspect ratio, continuous landscape filling every edge. NO characters, no owls, no text, no letters, no badges, no UI, no logo, no signs. Match the top header's exact palette and softly rounded school/trees rather than the other existing style samples.

### Journey landscape

Use case: compositing. Edit target: the provided schoolyard landscape. Create a companion landscape for a SMALL reading-journey map card, wide horizontal aspect ratio about 2.35:1. Keep the exact same soft rounded illustrated school, orange roof, lime/teal green trees, bright cyan sky, color palette and cartoon render style. Recompose so ONLY THE TOP 20-25% is sky and clouds, while rolling green foreground hills and a cream winding walking path occupy the LOWER 75-80%. School is SMALL at the upper right, nestled among trees. Path winds gently from lower left toward center-right and up to school, leaving clear open grass/path across the middle to overlay five small UI markers in code. Friendly childlike world. The reference image must retain its polished illustration look; change composition and zoom only as described. No characters, no owl, no map pins, no locks, no numbers, no text, no signs, no UI and no borders. Full landscape bleeding to all four edges.
