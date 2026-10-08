# ADR-0001: The design of the page

**Status:** Accepted   **Date:** 2026-10-03   **Deciders:** Vlad (sole maintainer)
**Superseded by:** ADR-0005 for the status panel and the status line of D4: what the page says in passing, the encoder loading, the image being read, the trials as they land and the result's time, is a toast, updated in place and announced through the toaster's live region
**Scope:** The look and behaviour of the page at `sqzer.dev`: the empty state, the page with an image on it, the controls, the search while it runs, the result, errors, the privacy claim and the wordmark. What the page is built with is ADR-0002, and the design system and component library it borrows are a record after that (D10). Anything not settled here is listed under Open.

---

## 1. Context

The page works and its look is a placeholder. A first design was built and parked on 2026-10-02 in pull request 1 (`feat/design`), with notes on what was wrong with it and the instruction to start the real one from proper references. This record starts from those notes, from the maintainer's review of its first draft, from a survey of comparable tools made on 2026-10-03, and from what the package offers that the page does not use yet.

### The notes from pull request 1

They are the maintainer's, and every decision below is held against them:

```text
logo         plain `sqzer` or `sqzer.dev` as text with weaving lines behind it, as on the
             ATH-M50x. freeform or a rectangle, not a circle. no depth. not tied to the target
drop zone    the whole page, or a full-height hero once the page has sections as Squoosh has.
             no depth. only a simple "drop the image" that leads straight into the app
with a file  the image does not get the focus. it should cover the whole screen, with every
             control and every piece of information in floating panels
handle       the drag point sits off the centre of the line
chart        should show target, quality and relative file size. more images processed add
             more lines, and the lines make the pattern. no background, only rules, fewer of them
result       the raw command-line output is cluttered. needs a friendlier form
system       borrow a design system. which one needs its own research
```

Added in review of the first draft of this record, on pull request 4:

```text
drop zone    a little animated background
panels       glassmorphism
chart        more images add lines only in batch mode. otherwise, subtle lines of previous runs
result       a clear output size and the difference, as Squoosh shows them. chips mark the
             booleans that applied, e.g. (lossless). the rest below, in an expander or on scroll
dimensions   in small bordered labels in the top-left and top-right corners of the screen
errors       an alert
privacy      "Don't trust us?" as the link
options      everything the package offers, behind an advanced expander. unused options are
             dead weight in the wasm the page already loads
components   headless, with a component library of our own or a borrowed one. no packaged
             widgets such as `img-comparison-slider`
build        a framework and a bundler, proposed in ADR-0002. the "one dependency" rule goes
phone        the panels in a bottom expander
selftest     `/selftest/` moves to a proper Playwright test suite
batch        later, probably after the AGPL switch
command line not shown on the page
```

The parked ADR-0001 on that branch is not accepted and binds nothing. One of its decisions survives the notes and the review and is carried into this record: the page starts at the package's defaults (its D5).

### The tools surveyed

Each page was loaded on 2026-10-03, and its HTML was searched for trackers. The trackers listed are the ones found that way. Pages that render only with JavaScript were read from their source or from reviews, and that is said where it applies.

```text
Squoosh          local. loads Google Analytics, sends a download event. default branch `dev`
                 last committed 2024-08-19. empty state: one "drop OR paste" zone, a picker,
                 four demo images labelled with their sizes. editor: a split slider over two
                 panes that zoom and pan together, zoom, rotate, a pixelated view and a
                 background toggle. per side: resize and palette, a format with its basic
                 options, "advanced settings" behind an expander, the size and the percent
                 next to a download button. progress: a spinner on the download button, shown
                 only after 500 ms. one image at a time. the divider is moved by keys 1 to 3
                 on the window and cannot be focused; zoom buttons have no accessible name.
                 on a phone the split turns vertical
TinyPNG          upload, kept "for a maximum of 48 hours". gtag. no quality control at all.
                 converts to AVIF, JXL, WebP, JPEG, PNG and marks the smallest result
Compressor.io    upload. Google Tag Manager, AdSense. refused the fetch, UI not verified.
                 self-hosts a variable woff2 font
ImageOptim web   upload. no preview. presets named by their trade-off: "Low (smallest
                 file)", "Medium", "High (largest file)"; colour "Messy", "Auto", "Sharp
                 (larger file)"
imagecompressor  says "entirely in your browser using WebAssembly", "no data collection".
  .com           loads AdSense and Matomo. a quality slider with -10, -1, +1, +10 buttons,
                 before, after and percent per image, up to 20 files
iLoveIMG         upload, gtag, Drive and Dropbox pickers. no controls, a counter while
                 uploading, batch
Shrink.media     not verified whether local. Google Analytics, Hotjar, Google Fonts. two
                 sliders in percent, "photo quality" and "photo dimensions"; shows size and
                 dimensions before and after
Caesium web      says "Images never leave you device". gtag, Matomo, a consent banner. a
                 quality slider, a lossless toggle, keep metadata
Pic Smaller      local, no tracker found. workers and Squoosh codecs. picker, folder, drop,
                 paste. split compare, ZIP download
MAZANOKE         local, no tracker found, GPL-3.0, a PWA. quality, a target file size, max
                 width and height, batch ZIP
Moda, Upsampler  a target size in KB, searched to fit
```

What recurs: one large drop target that names drop, paste and pick; a split comparison; a few controls first and the rest behind an expander; the sizes before and after next to one download button. What none of them has: a perceptual target, any quality number for the result, progress that says more than "compressing", and a privacy claim the page cannot contradict. Three of the five that run locally load a tracker, and two of those say they collect nothing.

Two patterns from outside image tools were read for the controls. `img-comparison-slider` (MIT) makes its divider a focusable control moved by the arrow keys. The GOV.UK file upload component keeps a real `<input type="file">`, makes the drop target large and always visible, and announces entering and leaving it.

### What the page has and what the package offers

The page meets ADR-0011 D6 in full, and some of it already does what the references get wrong: the file input is a real `<input>` in a `<label>`, the divider is an `<input type="range">` with an `aria-label`, the status line is `role="status"`, and the fonts are the system's.

What the package reports and the page does not use:

```text
lossless         an option of AVIF, PNG and WebP. the page offers target and fixed only
capped, reached  in every searched result. the page shows neither
availableIn      on `EncoderUnavailable` and `DecoderUnavailable`. the worker passes it on,
                 `main.js` drops it
animated         in every result. an animated file is encoded as its first frame, silently
outputWidth,     after a resize. the page prints them, not next to the input's
  outputHeight
TrialProgress    `{n, max, quality, score}`: the budget is known when the first trial lands
options          `effort`, `subsampling`, `fast`, `keepIcc`, `keepMetadata`, `height`, `fit`,
                 `position`, `background`, `scale`, `enlarge`, `filter`, `maxPixels`, and the
                 per-codec `codecOpts` that `codecs()` lists with a default and help text
```

What it does not report: the size of each trial. `Trial` and `TrialProgress` carry quality and score only, so a file-size axis on the chart, which the notes ask for, needs a change to `sqzer` first.

The page also sends `target: 70` on every encode today, even when the control was never touched. That is the package's default, but it is the page choosing it.

### What the score means

SSIMULACRA2 publishes what its numbers correspond to, and the page can say it in words instead of explaining the metric:

```text
90   visually lossless
85   excellent, not noticeable in place at 1:1
80   very high, not noticeable side by side at 1:1
70   high, barely noticeable side by side; not noticed without the original
50   medium, slightly annoying artifacts
30   low, obvious artifacts
```

The package's presets sit on the same scale: `thumbnail` 60, `web` 70, `archive` 85.

---

## 2. Decision

### D1. The empty state is the drop zone

With no file, the page is one drop target that fills the viewport: the wordmark, one line saying drop, paste or choose an image, and the button that opens the picker. No section, card or depth around it. The picker alone completes the task, so the page works without a pointer that can drag. The privacy line (D7) and the footer sit at the bottom edge.

Behind it runs a little animated background in the line language of the wordmark (D8): slow, low in contrast, and never a picture of anything. It stops when a file is dropped, when the tab is hidden, and under `prefers-reduced-motion`, where it is drawn still.

Every tool surveyed opens this way, and the notes ask for it. Sections under the hero, as Squoosh has, wait until there is something to put in them.

### D2. With a file, the image is the page

The comparison covers the viewport. Controls and numbers float over it in glass panels: translucent, with the image blurred behind them, a fine border and no drop shadow. Each panel can be collapsed. Nothing is laid out beside the image. On a phone, the panels collapse into one bottom expander that is pulled up over the image and lets it go again.

The dimensions sit in small bordered labels in the corners of the screen, on the side of the image they describe: the input's top left, over the before side, and the output's top right, over the after side. When the image was not resized both read the same, and that is also information.

The split between before and after stays a real `<input type="range">`, or a headless component with the same role and keys (D10), so keyboard and screen reader work. Its handle is centred on the line, and the line runs the full height of the image. The two sides zoom and pan together, as Squoosh's do. At 100 % and above the image is drawn pixelated, so the artifacts the score is about are what the reader sees. A checkerboard sits under transparent images, with a toggle to a flat colour. All of it works by keyboard, and every icon button has an accessible name.

The image is what the reader has to judge, and at fit-to-screen a 24 megapixel photo hides the artifacts that separate a target of 70 from one of 85. The parked build ruled zoom out; the notes overturn that by putting the image on the whole screen.

### D3. The target first, everything else behind Advanced

The first control is the target score, a slider from 30 to 100. Its value is printed with the line from section 1 that names it, "70, high: barely noticeable side by side", so the reader learns the scale while using it. The package's presets are marked on the track. Under it are two alternatives, never side by side with the target: a fixed quality, and lossless where `codecs()` says the chosen encoder has it. Format and width come after.

Behind an Advanced expander is every other option the package has: `effort`, `subsampling`, `fast`, `keepIcc`, `keepMetadata`, `height`, `fit` with `position` and `background`, `scale`, `enlarge`, `filter`, `maxPixels`, and the per-codec options. `maxPixels` is the way through for a file over the package's limit, so the `TooLarge` alert of D6 points to it, and its help says the tab may run out of memory above the default. The per-codec options are built from what `codecs()` lists for the chosen encoder, with its default and its help text, so a new option in a release of `sqzer` shows up without a change here. A control shows only where it applies, `position` only with `cover` or `contain`, as the package's README states. A combination the package refuses comes back as `InvalidParams` and is shown as an alert (D6), not checked twice.

The defaults are the package's, and the page does not restate them. A control that was not touched sends nothing, so dropping a file with nothing changed calls `encode()` with no options and gives the bytes the package gives with no options. The value a control shows before it is touched is the package's default, read from the package where it says so, and labelled as the default.

The wasm the page loads already carries every one of these options. Leaving them unreachable keeps the cost and drops the use. What two people set differently is visible in the result: every option that was sent shows as a chip (D5).

### D4. The search is shown as it runs

For the first 500 ms of a search, nothing changes, so a fast encode does not flash. After that the status panel shows each trial as it lands: its number out of the budget, its quality and its score, as in `trial 3 of at most 6: q 62, score 71.4`. There is no percent bar, because the search usually stops before the budget is spent. A cancel button sits beside it, and cancelling ends the worker, as it does now.

The chart is the same data drawn over rules: plain horizontal lines, one every twenty points of quality, with no ticks and no background. Each trial is a point and consecutive trials are joined. The target is one labelled rule. The runs before this one in the session stay behind it as subtle lines, so changing the target or the format and searching again shows where the new search went against the old ones. They last as long as the tab: a reload starts with an empty chart, and nothing is stored. Several images at full weight belong to batch mode, which is later (section 3). Its axes are quality and score until the package reports a size per trial (Action items). The chart comes from the numbers and draws nothing that did not happen.

The status line stays `role="status"`. Only a trial's text is announced, not the drawing.

### D5. The result: the size, the difference, chips

The result panel leads with the output size and the difference, set large, as Squoosh shows them, and the download button next to them:

```text
19.3 KB    96 % smaller                                   [ Download ]
reached  resized  metadata
```

Chips under the size mark the booleans that applied and the options that were sent, one word each: `lossless`, `reached` or `missed`, `resized`, `metadata`, `icc`, `animated` for an input of which only the first frame was encoded, and the name of each Advanced option set away from its default, such as `effort`. The full meaning of a chip, "metadata kept" or "effort 9, default 6", is its tooltip and its accessible name. When the chips do not fit on one line, the ones that do are shown and the rest collapse into a last chip, `+3`, that expands them. A result with no chips is the package's defaults.

Everything else sits below, behind an expander on a wide screen and further down the bottom expander on a phone: the input size, the score with its words, the format, the quality, the trials, the backend and its tier, and the full record the package returned, so a bug report can still carry the raw numbers. When the search stopped short, the panel says so in one line there: "the target was not reached; this is the best quality the encoder has" for `capped`, and the score it did reach. The dimensions are in the corner labels of D2, not here.

### D6. Errors and limits are an alert

Errors are shown as an alert in the panel, between the download button and the options, where most forms put theirs; with no result yet it sits above the options, and on a phone the bottom expander opens to show it. It has one sentence that names the file and what to do, a way to dismiss it, and `role="alert"` so it is announced. Every `SqzerError` kind has its sentence. `EncoderUnavailable` and `DecoderUnavailable` say which build has the format, from `availableIn`. `TooLarge` gives the limit in megapixels and points to `maxPixels` under Advanced. `InvalidParams` names the options that clash. A note that is not a failure, such as an animated input encoded as its first frame, is a chip (D5), not an alert.

### D7. The privacy claim is one the page can prove

One sentence, present in both states: the image is encoded in this tab and nothing is sent anywhere. Next to it is the link "Don't trust us?". It opens a short note that quotes the `Content-Security-Policy` and says how to check it in the browser's network panel. The page never claims more than the CSP enforces.

Of the five local tools surveyed, three load a tracker, and two of those say next to it that they collect nothing. A claim the reader can check is the one thing those pages cannot offer.

### D8. The wordmark is the name with lines behind it

The wordmark is `sqzer` in type, with weaving fine lines behind it in a free form or a rectangle: no circle, no depth, no tie to the target. It is drawn as inline `<svg>`. The Audio-Technica mark is not lifted or echoed. The lines are a shared vocabulary, their mark is not.

### D9. The accessibility floor

Taken from what the references get wrong. Drag is never the only way to do anything. Every control is a native element or has the role, name and keyboard behaviour of one. Every icon button has an accessible name. Status is announced politely and errors as alerts.

Text on a glass panel meets contrast against the brightest and the darkest image it can sit over, not against the average, and the panel falls back to an opaque surface under `prefers-reduced-transparency` and `prefers-contrast: more`. The page holds at 320 px wide, under `prefers-reduced-motion` (the background drawn still, the chart showing the finished state without drawing in), and in light and dark.

### D10. A design system and a component library, borrowed

The page borrows a design system rather than invent one, as the notes say. Its components are headless, from a library of our own or a borrowed one, and styled by that design system. A packaged widget that brings its own markup and look, such as `img-comparison-slider`, is not used. Which system and which library is a record of its own, after ADR-0002 settles the framework and the bundler, since the choice depends on both.

The page loses no limit that protects the reader. Dependencies are fine, but everything they bring is served from the page's own origin: no font, script, stylesheet or image from another host at run time, and no change to the `Content-Security-Policy` for one. Their licences are MIT or Apache-2.0 compatible until the switch to the AGPL build. Until that record exists, this one fixes behaviour and layout, not colour, type or spacing.

---

## 3. Options considered

**Keep the command-line block as the result** (parked D6). Rejected by the notes: it is cluttered for the reader who only wants the size. The raw record stays in the details for bug reports.

**One control and no codec options** (parked D4). Rejected in review: the wasm carries every option either way, and the chips of D5 show which ones were used, so two different results can be told apart.

**Print the equivalent command line.** Rejected in review. The page and the command line are separate products, and the chips already say what was set.

**A target file size**, as MAZANOKE, Moda and Upsampler do. Not available: the package searches a score, not a size. It would be a change to `sqzer` first, and it fights the product's idea that the same score is the same look on any image.

**Vendor `img-comparison-slider`.** Rejected: a packaged widget with its own markup and look. A headless split from the component library of D10 does the same and takes the design system's style.

**A percent progress bar.** Rejected: the budget is a maximum, not a count. A bar would jump from 50 % to done on most images.

**Every run in the session at full weight.** Rejected in review: one image is on the screen, so its run is the one drawn. Earlier runs stay as subtle lines. Several images at full weight wait for batch.

**Batch and ZIP download**, as Pic Smaller, MAZANOKE, TinyPNG and iLoveIMG have. Deferred, not rejected: ADR-0011 D6 does not ask for it, one image on the whole screen comes first, and it is likely to come after the switch to the AGPL build.

**Sample images to try.** Open: Squoosh's labelled samples let someone try the page with no file of their own, while the 1.8 MB package loads. They would be files in `site/`, encoded by `sqzer`, with their sizes shown.

---

## 4. Trade-offs

**The image on the whole screen against the controls.** Floating panels cover part of the picture the reader is judging. They can be collapsed, and the split stays usable under them. A side column would never cover the image, but it would show it smaller.

**Glass against legibility and cost.** A blurred panel over a photo changes contrast with every image, and `backdrop-filter` over a 24 megapixel image costs frames while zooming. D9 sets contrast against the worst case and gives an opaque fallback, and the panels have to be checked while zooming on a phone.

**Every option against a calm first screen.** Advanced holds more controls than the rest of the page together. It stays closed until opened, and the chips keep the result honest about what was set.

**Words against precision.** "70, high" is an average observer at 1:1. For some images 70 will look worse than the words say, and the words are the metric's, not ours. The number is always printed next to them.

**A chart without size against the notes.** The notes ask for size, and the package does not report it per trial. The chart ships with quality and score and gains size after a release of `sqzer`, not through a workaround here.

---

## 5. Consequences

What becomes easier: the page says what the score means in its own published terms, so the target needs no explainer copy. The result reads at a glance, and the chips and the raw record say how it was made. Everything the package can do is reachable. The privacy claim becomes something a reader can test.

What becomes harder: zoom and pan, the glass panels, the bottom expander, the chart and the Advanced panel built from `codecs()` all have to hold at 320 px wide and at 24 megapixels. Error copy has to cover every error kind and stay true as the package adds formats. The visual work waits for ADR-0002 and the design system record.

What changes outside this record: the page described here is not the plain HTML page with one module and no build step that ADR-0011 D6 of `sqzer` and this repository's `CLAUDE.md` describe. ADR-0002 is where that changes, and it has to say so in both places.

What to revisit: whether readers find the alternatives to the target and the Advanced expander, and whether the subtle lines of earlier runs read as a record of their searches or as decoration.

---

## 6. Action items

1. [ ] `sqzer-dev/sqzer`: an entry in `ROADMAP.md` and an issue for the size of each trial in `Trial` and `TrialProgress`, so the chart of D4 can draw it. A version bump here after its release. (The issue is https://github.com/sqzer-dev/sqzer/issues/55. The roadmap entry and the release are still to come.)
2. [x] ADR-0002: a framework and a bundler. It records what changes from ADR-0011 D6 for this page, and updates `CLAUDE.md`, `README.md` and the `package-by-version` rule in `.greptile/config.json`.
3. [x] `/selftest/` moved to a Playwright test suite, run by `check.yml`. With ADR-0002 or right after it. (With the port of ADR-0002: the `decodeAny` checks went to Vitest in browser mode, the rest to Playwright.)
4. [x] A survey of design systems and headless component libraries against D10, and the record that picks them. (ADR-0003.)
5. [x] Controls that were not touched send nothing (D3). Today the page always sends `target: 70`. (The score field starts empty and says `default`. The package states its default score in its docs only, so the page has no number to show there before a search.)
6. [ ] The empty state of D1 and the full-screen comparison of D2: glass panels, corner labels, centred handle, synced zoom and pan, pixelated view, background toggle, bottom expander. (In two pull requests. The first has the empty state, the image over the whole screen, the panels, the corner labels in the corners of the screen, the centred handle, the background toggle and the bottom expander. Zoom and pan with the pixelated view came second, in the next pull request: the wheel, two fingers, a drag and the keys, with the zoom buttons in the view bar. The animated background waits for its form, under Open.)
7. [ ] The target control and the Advanced expander of D3.
8. [ ] The trial list, cancel and chart of D4.
9. [ ] The result panel of D5, the alerts of D6 and the privacy note of D7.
10. [ ] The wordmark of D8.
11. [x] Close pull request 1 once this record is accepted. Its branch stays as the record of what was tried.

---

## Open

- Sample images (section 3).
- The form of the animated background in D1, within the line language and the limits set there.
- Whether the details of D5 are an expander or simply what follows on scroll. Both were named in review.
- Colour, type and spacing, under D10.

---

## Sources

- Pull request 1, `feat/design`, the notes at its top: https://github.com/sqzer-dev/sqzer.dev/pull/1
- Pull request 4, the review of the first draft of this record: https://github.com/sqzer-dev/sqzer.dev/pull/4
- ADR-0011 D6, `sqzer-dev/sqzer`: https://github.com/sqzer-dev/sqzer/blob/main/docs/adr/0011-browser-build.md
- `crates/sqzer-wasm/src/output.rs` and `crates/sqzer-wasm/README.md` in `sqzer-dev/sqzer`, for `Output`, `Trial`, `TrialProgress` and the options
- SSIMULACRA2, the meaning of its scores: https://github.com/cloudinary/ssimulacra2
- Squoosh: https://squoosh.app, https://github.com/GoogleChromeLabs/squoosh
- TinyPNG: https://tinypng.com
- Compressor.io: https://compressor.io
- ImageOptim online: https://imageoptim.com/online
- imagecompressor.com: https://imagecompressor.com
- iLoveIMG: https://www.iloveimg.com/compress-image
- Shrink.media: https://shrink.media
- Caesium: https://caesium.app
- Pic Smaller: https://github.com/joye61/pic-smaller
- MAZANOKE: https://mazanoke.com
- `img-comparison-slider`: https://github.com/sneas/img-comparison-slider
- GOV.UK file upload: https://design-system.service.gov.uk/components/file-upload/
- `prefers-reduced-transparency` on MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency
