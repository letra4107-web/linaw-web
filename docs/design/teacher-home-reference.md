# Teacher Home reference

The Teacher Home follows the supplied purple classroom reference: a full-width welcome banner, search/notification/profile controls, date card, four pastel metrics, two middle panels and three bottom panels. The illustrated sidebar uses the same five destinations and existing profile menu across Teacher pages.

The greeting uses the authenticated display name and Manila time. The avatar uses the saved Teacher photo, with the existing illustration as a fallback. Student counts, accuracy, pending assignments and learning-material counts retain the existing database sources and calculations. The active-material count continues to mean teacher-created PDF materials.

The chart supports the last 7 days, last 30 days and all time. Date ranges aggregate the current teacher's roster practice records; the query pages through 500 records at a time with stable timestamp/ID ordering. All time uses existing child-progress totals. Up to five students appear, with numeric percentages and names. Empty, loading and failed requests have separate states; failures do not pretend to be zero progress.

Search opens the existing roster with a name/username query. Metrics, panel links and actions lead to existing protected Teacher routes. The roster-management action is labelled “Pamahalaan ang Mag-aaral” because the existing roster follows grade assignments rather than a separate Home enrollment form. No backend or database changes are required.

The existing Comic Sans/OpenDyslexic accessibility preferences remain in effect. Light mode follows the reference palette; dark mode retains the structure using muted purple, blue and green surfaces. The sidebar collapses, short screens keep the profile control visible, and smaller screens stack the panels.

## Artwork

- `src/assets/teacher/home-classroom-banner.png`: generated classroom background with a Filipina teacher in a purple blazer holding a tablet; left copy space, right window/date space, books and plants. Created with the imagegen skill as a new background asset; no UI text or metrics are baked into it.
- `src/assets/teacher/home-illustrations.png`: generated transparent 4×2 atlas containing pupils, books, trophy, clipboard, reading child, owl/clock, support group and sidebar books. `TeacherHomeArt` imports this as an actual image in development and production. CSS positions the image within each cell; the original atlas is retained intact.
- Existing Teacher illustration, sidebar plants and LinawLetra logo are reused.

Generated artwork interprets the supplied reference; it is not a pixel-identical copy of the reference's original illustrations. The editable UI recreates its layout and colors using the application's actual records.

## Screenshot follow-up

The long-name header uses a smaller title while retaining the full saved display name. Sidebar quotes now participate in the available scene layout rather than using a fixed bottom offset. Compact desktop windows use smaller scene text/art, and short windows omit the decorative quote so the profile menu remains visible. Hovering or revisiting a summary card keeps its intended text color and removes inherited link underlines.
