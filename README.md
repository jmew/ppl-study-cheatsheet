# PPL Study Guide

A clean, searchable study guide and flashcard site for the **FAA Private Pilot
(PPL) written knowledge exam**, built from handwritten lecture notes.

It's a static website — plain HTML, CSS and JavaScript with **no build step and
no dependencies** — so it hosts on GitHub Pages (or any static host) as-is.

## Features

- **12 topic pages** covering aerodynamics, systems & instruments, airspace,
  airports, ATC, performance & weight/balance, regulations, weather, weather
  reports, navigation, navigation planning and human factors.
- **Diagrams** — a mix of custom theme-aware SVGs that adapt to light/dark
  (drag curve, axes of rotation, traffic pattern, pressure systems & fronts,
  cross-radial VOR fixes, the VFR cruising-altitude compass, the
  supplemental-oxygen ladder, PAPI vs VASI, weight & balance, and
  airspace/chart-symbology swatches) and annotated lecture-slide screenshots in
  `images/` (four forces,
  airspeed-indicator arcs, the pitot-static system, VOR/CDI, cloud types, and
  more).
- **Click to enlarge** — click any diagram or screenshot to open it full-screen
  in a lightbox (close with the ×, a click outside the image, or <kbd>Esc</kbd>).
- **Instant search** across every topic (press <kbd>/</kbd> to focus it).
- **Flashcard deck** (~140 cards) — filter by topic, shuffle, flip with the
  keyboard.
- **Highlight-to-comment notes** — select any text on a topic page to attach a
  note. Notes are highlighted, listed via the floating **Notes** button, and
  saved per page in your browser (localStorage). Click a highlight to view,
  edit, or delete it. (Disabled on the Flashcards page, whose content changes.)
- **Light / dark mode** (remembers your choice).
- **Print-friendly** — print any page as a paper cheatsheet.
- Fully responsive.

## Run it locally

Just open `index.html` in a browser, or serve the folder for clean URLs:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then visit <http://localhost:8000>.

## Publish on GitHub Pages

1. Create a repo and push this folder:

   ```bash
   git init
   git add .
   git commit -m "Add PPL study guide site"
   git branch -M main
   git remote add origin https://github.com/<you>/ppl-study-guide.git
   git push -u origin main
   ```

2. On GitHub: **Settings → Pages → Build and deployment**.
3. Set **Source** to *Deploy from a branch*, choose **`main`** and **`/ (root)`**, and save.
4. Your site will be live at `https://<you>.github.io/ppl-study-guide/` in a minute or two.

The included `.nojekyll` file tells GitHub Pages to serve the files directly.

## Project structure

```
ppl-study-guide/
├── index.html              # Home: intro + topic grid
├── aerodynamics.html       # …one page per topic…
├── flashcards.html         # Self-quiz deck
├── css/style.css           # Theme, layout, light+dark, lightbox, notes, print
└── js/
    ├── data.js             # Search index + flashcard data (single source)
    ├── main.js             # Shared header/footer, theme, nav, TOC, pager
    ├── search.js           # Instant cross-page search
    ├── flashcards.js       # Flashcard deck logic
    ├── comments.js         # Highlight-to-comment notes (localStorage)
    └── lightbox.js         # Click-to-enlarge image lightbox
```

To add or edit content, edit the relevant topic page; to add search results or
flashcards, edit `js/data.js`.

## Disclaimer

For **study only** — not for navigation or flight operations. The content is
cleaned up and lightly fact-checked, but always verify against current FAA
publications (PHAK, AIM, FAR/AIM) and your CFI before relying on any number.
