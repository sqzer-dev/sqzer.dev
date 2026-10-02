# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

The page at `sqzer.dev`: a static page that runs the `sqzer` npm package in the browser. The package is built from `crates/sqzer-wasm` in `github.com/sqzer-dev/sqzer`; its API is that crate's `README.md`, and the decisions behind this page are ADR-0011 D6 in that repository's `docs/adr/0011-browser-build.md`. This repository holds the page only.

Solo-maintained. Plain HTML, one ES module (`site/main.js`) and one worker script (`site/worker.js`). No framework, no bundler, no build step, no dependency other than `sqzer`.

## Layout

```
site/               published to GitHub Pages as it is, on every merge to `main`
site/index.html     markup and the Content-Security-Policy
site/main.js        the file, the controls, the worker's lifetime, what is shown
site/worker.js      every call into `sqzer`. The message protocol is at its top
site/package.json   the version of `sqzer`, read by `worker.js` at run time, bumped by Dependabot
site/selftest/      `decodeAny` checked in the browser that opens it
docs/adr            decisions. Add a new numbered file, never edit an accepted one
```

## Rules

- The page depends on the published package by exact version, from jsDelivr, never on a checkout of `sqzer`. `site/package.json` is the only place the version is written.
- It sends nothing anywhere: no analytics, no error reporting, no third-party request other than jsDelivr. The `Content-Security-Policy` in `index.html` says so; do not widen it for convenience.
- Every call into `sqzer` runs in the worker. The package is synchronous, and a search takes seconds.
- A search cannot be interrupted. `main.js` ends the worker and starts another; keep that the only way an encode is cancelled.
- The package's decoder comes first, the browser's canvas decodes what the package cannot. An SVG is drawn on the page from an `<img>`, at the size asked for: `createImageBitmap` refuses an SVG blob inside a worker in Chrome and Firefox.
- What the format list offers comes from `codecs()`. Do not hardcode formats or backends.
- Never write a decoder, encoder, resampler or metric here. If the package lacks something, that is a change to `sqzer`.
- Licence: MIT or Apache-2.0. When the page switches to the AGPL build of `sqzer`, the repository becomes AGPL-3.0 (ADR-0011 D6). Do not import AGPL code before that switch is made deliberately.

## Design

`docs/adr/0001-page-design.md` decides the look; `0002` settles what it left open. Read both before touching `style.css` or the markup. The rules that are easy to break:

- Monochrome, dark first. No hue anywhere: a larger file, an error and a selected control are told by the sign, the word and the weight.
- Two registers. 1 px lines in `--line` are for the chart, the ring of the wordmark and the rules of the empty drop zone, nothing else. Everything read or pressed is plain type on plain surfaces with `--border`.
- The chart is the progress display, and every mark on it is a number the worker reported. Nothing decorative, no spinner, never a raster.
- The result block is the command line's own lines, in monospace. No stat tiles, no table.
- The target slider is the one control. Format and width stay small, the fixed quality stays subordinate, codec options stay in the CLI.
- No imagery of the page's own. An image added later goes through `sqzer` and shows its size.
- The word "music" and waveform imagery never appear.

## Commands

```sh
python3 -m http.server -d site 8000   # the page, at http://localhost:8000
# http://localhost:8000/selftest/     # the browser checks, one line each
```

There is no test suite and no linter. A change is checked by loading the page in Chrome and Firefox: a JPEG, an SVG, a TIFF (shown through the worker's preview), a file that is no image, and a change of format while a search runs. Safari needs Apple hardware; ask.

## Workflow

- `main` deploys. Work on a branch, open a PR, squash-merge.
- Conventional commit prefixes: `feat: ...`, `fix: ...`, `chore: ...`.
- After a release of `sqzer`: bump `site/package.json`, or merge the Dependabot PR, then load the page once.

## Writing style for anything user-facing

The same as in `sqzer`: sentence case headings, short prose then a fenced block, backticks on every identifier, no em dashes, no emoji, no tables, uncertainty stated flatly.
