# Teacher account menu layout

The Teacher profile popup was 18 rem wide inside a 240 px sidebar. Sidebar clipping hid the right part of the popup, including account details. The popup now renders through a portal inside the Teacher theme root, outside the sidebar's clipping container.

Its fixed position follows the profile button. It opens above the desktop footer and below the mobile header when space permits, clamps to the visible viewport, and scrolls internally on short screens. Resize, scrolling, sidebar collapse and visual viewport changes update placement. Crossing the desktop/mobile breakpoint closes a popup whose trigger becomes hidden.

Account names and email addresses wrap without ellipsis or horizontal overflow. The teacher's uploaded photo appears in the sidebar button and popup. The footer button has a more opaque background so sidebar artwork does not show through the account text. Dark-mode sign-out text has sufficient contrast.

The same four existing actions remain: Aking Detalye, Mga Setting, Mga Abiso, and Mag-sign out. Outside-click detection includes the portaled menu. Arrow keys, Home/End, Escape, focus return, menu-item navigation and logout continue to use the existing handlers. Route changes close the popup.

Verification uses the actual React application with synthetic Auth/data responses. Local browser evidence is under `.qa/teacher-menu-fix-review/`. Checks cover all eight Teacher routes, expanded/collapsed sidebars, long names/emails, menu hit-testing outside the sidebar, desktop/tablet/mobile dimensions, short screens, enlarged text, and light/dark WCAG checks. No live accounts or database records are modified.

Final result: 34 browser checks passed, zero failed. Production build, lint and diff whitespace checks passed. No SQL or backend changes are needed for this layout correction.
