# Ondo Finance ($ONDO) research note

A single-page, static research note on Ondo Finance and the $ONDO token: the real-world-asset (RWA) tokenisation stack, the platform-versus-token distinction, the rate-dependence of the yield, and the tokenomics overhang. Independent work by Loong Bong.

No position held; this is research, not investment advice. Figures are as of mid-2026. rwa.xyz and DefiLlama are the canonical public trackers.

## Run locally

Any static file server works, for example:

    python3 -m http.server 8090

then open http://localhost:8090/

## Structure

- `index.html` — the note. The content is static HTML; the visualisations are progressive enhancement.
- `css/styles.css` — vendored design tokens and components (shared with the author's portfolio).
- `css/ondo.css` — note-specific styles, the data visualisations, and the teal accent.
- `js/ondo.js` — count-ups, the SVG donut and unlock timeline, the risk accordion, and the motion.
- `assets/` — favicon and the social preview image.

No build step, no dependencies, no framework. Hosted on GitHub Pages.
