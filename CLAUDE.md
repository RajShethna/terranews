# Terra News — hard rules

Terra News is an interactive world-news globe: `index.html` (marketing landing page) and
`globe.html` (the full-screen 3D globe app), both **Claude Design exports** running on a
shared generated runtime, `support.js`. No build step, no framework install.

## Hard rules

1. **Never edit `support.js`.** It is generated — the file's own header says
   `GENERATED from dc-runtime/src/*.ts — do not edit. Rebuild with `cd dc-runtime && bun run build`.`
   Verify it is byte-identical before every deploy (currently 61,572 bytes, sha256 starting `78f6b3cb83ef`).
2. **Never re-export `index.html`/`globe.html` from Claude Design.** The export emits
   desktop-width inline styles and overwrites both the `@media` blocks and the `clamp()`
   values that make the site responsive. If a re-export is unavoidable, diff old vs new and
   port every responsive fix (see below) forward manually.
3. **Never ship without `support.js`** in the same folder as the two HTML files. Without it
   both pages render blank — `./support.js` is a relative reference.
4. **Do not lower the 16px input rule** in either file's `@media(max-width:900px)` block
   (`input,select,textarea{font-size:16px!important}`). It exists to prevent iOS from
   zooming the page when a control is focused.
5. Inline styles cannot hold media queries. For anything breakpoint-dependent, add an
   id/class and put the rule in the `<helmet>` `<style>` block with `!important` (needed to
   beat inline specificity, since almost all styling on these pages is inline `style`
   attributes).
6. Prefer intrinsic responsiveness (`clamp()`, `auto-fit`/`minmax`, `flex-wrap`) over new
   breakpoints. Fewer breakpoints, fewer regressions.
7. Watch `width:auto` on absolutely-positioned elements. It only stretches to fill when
   **both** `left` and `right` are pinned — otherwise it shrink-wraps to content. (This bit
   the guided-tour popup once already: collapsed to ~195px on mobile until fixed with an
   explicit `width:calc(100vw - 24px)`.)

## Testing

`check_mobile.py` (needs `vendor/react.production.min.js`, `vendor/react-dom.production.min.js`,
`vendor/babel.min.js` — see the file's own `MAP`/setup, not committed, `.gitignore`d) drives
both pages headless at six widths and checks: horizontal overflow, unresolved `{{ }}`
interpolations, clipped content, overlapping floating panels, and tap targets under 28px.
Run it before every deploy: `python3 check_mobile.py`. Exit 1 means something to look at —
but not everything it flags is a regression; see below.

Headless Chromium won't reproduce real iOS Safari behaviour, particularly the address bar
resizing the viewport against `100dvh`. Always confirm on a physical phone before calling a
change done.

### Known baseline exceptions (not regressions)

As of the initial repo setup, `check_mobile.py` does **not** return a clean 0-issue run.
Two categories are expected and pre-existing — not caused by, or in scope for, the mobile
responsiveness pass already applied to these files:

- **`globe.html` at 1280px (true desktop, above the 900px breakpoint):** the search input
  (`#tg-search input`) and time-machine range slider have no explicit height and size to
  their own line-height (~15-16px). No CSS rule targets widths above 900px, so this is
  native, unchanged desktop sizing — a touch/tap-target guideline doesn't meaningfully apply
  to a mouse-driven desktop layout.
- **`index.html` header nav links (`#hdr-nav`) at ≥760px:** `How it works` / `Instruments` /
  `Method` / `FAQ` are plain, unpadded ~11px-tall text links. They're only hidden below the
  760px breakpoint; from 760px up to full desktop width they render at native size. At
  768px specifically (a common tablet width, and genuinely touch on real devices) this is a
  legitimate small-tap-target situation the current breakpoint doesn't address — worth
  revisiting if tablet-width touch support becomes a goal, but out of scope for the
  phone-focused pass that's already landed.

If a *future* run flags something beyond these two categories, treat it as a real
regression and investigate before deploying.
