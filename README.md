# Terra News

An interactive world-news globe. Spin a live 3D globe, click a city or country, and get the
current story, the history behind it, and the sources it rests on — no account, no paywall.

**Live:** https://terranews.netlify.app

## What's here

Two pages, no build step, no framework install:

| File | Role |
|---|---|
| `index.html` | Marketing landing page, with a small d3 canvas globe in the hero. |
| `globe.html` | The app itself — a full-screen 3D globe ([globe.gl](https://globe.gl)) with floating info panels. |
| `support.js` | Generated runtime that both pages load. **Do not edit by hand** — see [DEVELOPMENT.md](./DEVELOPMENT.md). |

Both pages use a declarative export format: markup with `{{ }}` interpolation and a
`<script type="text/x-dc">` logic block, interpreted at runtime by `support.js`, which in
turn loads React, ReactDOM, and Babel from a CDN. There's nothing to install or compile —
open `globe.html` (with `support.js` alongside it) and it renders.

## Features

- **Search anywhere** — fly to any of 37 mapped locations by city or country name
- **Equal Earth flat map** — toggle to a projection that preserves true relative land area
- **Story arcs & category heat map** — visual links and topic coloring across the globe
- **Time machine** — scrub the last seven days and replay how stories broke
- **Source balance** — a per-story bar showing the mix of wire, national, and local reporting
- **"Just the facts"** — strip interpretive language down to the verified record
- **AI situational brief** — a short, clearly-labeled, unverified synthesis on request
- **Bookmarks & follows, day/night terminator, guided tour** — stored locally in your browser

## Live news

The globe's News tabs are refreshed hourly from the public RSS feeds of 15 outlets (NPR, CNN,
Al Jazeera, CBC, Euronews, and others). A scheduled GitHub Action
([`.github/workflows/news-feed.yml`](./.github/workflows/news-feed.yml)) runs the pipeline in
[`feed/`](./feed), which:

1. fetches each outlet's feed,
2. matches articles to the 37 mapped locations by name,
3. groups articles about the same event across outlets into one story,
4. publishes only stories reported by at least two different outlets,
5. writes `feed.json` (read by `globe.html`) and a rolling seven-day archive in `data/`.

Each story links out to every outlet that covered it. The History tabs remain hand-written. If
`feed.json` is missing or invalid, `globe.html` falls back to its built-in July 2026 snapshot.

## Development

There's no build. To work on this locally, see [DEVELOPMENT.md](./DEVELOPMENT.md) for the hard rules
(what never to edit, why) and `check_mobile.py` for the mobile-regression test harness used
before every deploy.

## Deployment

Static site on Netlify, deployed straight from the `main` branch — no build command, publish
directory is the repo root.
