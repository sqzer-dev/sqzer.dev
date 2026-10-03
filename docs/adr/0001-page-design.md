# ADR-0001: The design of the page

**Status:** Proposed   **Date:** 2026-10-03   **Deciders:** Vlad (sole maintainer)
**Scope:** The look and behaviour of the page at `sqzer.dev`: the empty state, the page with an image on it, the controls, the search while it runs, the result, errors, the privacy claim and the wordmark. What the page does, its file layout and its constraints are fixed by ADR-0011 D6 of `sqzer-dev/sqzer` and are not revisited. The design system the page borrows is chosen in a record of its own (D10). Anything not settled here is listed under Open.

---

## 1. Context

The page works and its look is a placeholder. A first design was built and parked on 2026-10-02 in pull request 1 (`feat/design`), with notes on what was wrong with it and the instruction to start the real one from proper references. This record starts from those notes, from a survey of comparable tools made on 2026-10-03, and from what the package offers that the page does not use yet.

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

The parked ADR-0001 on that branch is not accepted and binds nothing. Three of its decisions survive the notes and are carried into this record: one control built around the target with no codec options (its D4), defaults that match the command line (its D5), and no mention of music or waveforms (its D1).

### The tools surveyed

Each page was loaded on 2026-10-03, and its HTML was searched for trackers. The trackers listed are the ones found that way. Pages that render only with JavaScript were read from their source or from reviews, and that is said where it applies.

```text
Squoosh          local. loads Google Analytics, sends a download event. default branch `dev`
                 last committed 2024-08-19. empty state: one "drop OR paste" zone, a picker,
                 four demo images labelled with their sizes. editor: a split slider over two
                 panes that zoom and pan together, zoom, rotate, a pixelated view and a
                 background toggle. per side: resize and palette, a format with its basic
                 options, "advanced settings" behind an expander. progress: a spinner on the
                 download button, shown only after 500 ms. one image at a time. the divider is
                 moved by keys 1 to 3 on the window and cannot be focused; zoom buttons have
                 no accessible name. on a phone the split turns vertical
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
```

What it does not report: the size of each trial. `Trial` and `TrialProgress` carry quality and score only, so a file-size axis on the chart, which the notes ask for, needs a change to `sqzer` first.

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

With no file, the page is one drop target that fills the viewport: the wordmark, one line saying drop, paste or choose an image, and the button that opens the picker. No section, card or depth around it. The picker alone completes the task, so the page works without a pointer that can drag. The privacy sentence (D7) and the footer sit at the bottom edge.

Every tool surveyed opens this way, and the notes ask for it. Sections under the hero, as Squoosh has, wait until there is something to put in them.

### D2. With a file, the image is the page

The comparison covers the viewport. Controls and numbers float over it in panels that can be collapsed. Nothing is laid out beside the image, so on a phone the image is still the whole screen.

The split between before and after stays a real `<input type="range">`, so keyboard and screen reader work without script. Its handle is centred on the line, and the line runs the full height of the image. The two sides zoom and pan together, as Squoosh's do. At 100 % and above the image is drawn pixelated, so the artifacts the score is about are what the reader sees. A checkerboard sits under transparent images, with a toggle to a flat colour. All of it works by keyboard, and every icon button has an accessible name.

The image is what the reader has to judge, and at fit-to-screen a 24 megapixel photo hides the artifacts that separate a target of 70 from one of 85. Zoom was ruled out in the parked build. The notes overturn that by putting the image on the whole screen.

### D3. The target is the one control, in words

The control is the target score, a slider from 30 to 100. Its value is printed with the line from section 1 that names it, "70, high: barely noticeable side by side", so the reader learns the scale while using it. The package's presets are marked on the track. Under it are two alternatives, never side by side with the target: a fixed quality, and lossless where `codecs()` says the chosen encoder has it. Format and width come after.

No codec-specific option is exposed. Anyone who needs `avif:tune=ssim` has the command line. The defaults are the package's: the page sends no option it was not given, so dropping a file gives the bytes the package gives with no options.

A slider over a number field is ImageOptim's lesson: the reader picks an outcome, not a setting. The words come from the metric's own published scale, so the page claims no more than SSIMULACRA2 does.

### D4. The search is shown as it runs

For the first 500 ms of a search, nothing changes, so a fast encode does not flash. After that the status panel shows each trial as it lands: its number out of the budget, its quality and its score, as in `trial 3 of at most 6: q 62, score 71.4`. There is no percent bar, because the search usually stops before the budget is spent. A cancel button sits beside it, and cancelling ends the worker, as it does now.

The chart is the same data drawn on rules, with no background and few rules. Each trial is a point and consecutive trials are joined. The target is one labelled rule. Every image processed in the session leaves its line, and those lines make the pattern the notes ask for. Its axes are quality and score until the package reports a size per trial (Action items). The chart comes from the numbers and draws nothing that did not happen.

The status line stays `role="status"`. Only a trial's text is announced, not the drawing.

### D5. The result in plain words

The result panel leads with the two sizes and the change, set large, then the dimensions when the image was resized:

```text
464.6 KB  ->  19.3 KB    -96 %
1600 x 1200  ->  800 x 600
score 70.6, high          jpeg, quality 69, 3 trials
```

When the search stopped short, the panel says so in one line: "the target was not reached; this is the best quality the encoder has" for `capped`, and the score it did reach. A lossless result says "lossless" in place of the score. The backend and its tier go behind a details toggle, with the full record the package returned, so a bug report can still carry the raw numbers.

The download button sits next to the sizes and is the largest control on the panel.

The notes call the command-line block cluttered. The sizes are what everyone reads, and the rest is for the few who want it.

### D6. Errors and limits are said in words

Every `SqzerError` kind gets one sentence that names the file and what to do. `EncoderUnavailable` and `DecoderUnavailable` say which build has the format, from `availableIn`. An animated input gets a note that only the first frame was encoded. `TooLarge` gives the limit in megapixels.

### D7. The privacy claim is one the page can prove

One sentence, present in both states: the image is encoded in this tab and nothing is sent anywhere. A link next to it opens a short note that quotes the `Content-Security-Policy` and says how to check it in the browser's network panel. The page never claims more than the CSP enforces.

Of the five local tools surveyed, three load a tracker, and two of those say next to it that they collect nothing. A claim the reader can check is the one thing those pages cannot offer.

### D8. The wordmark is the name with lines behind it

The wordmark is `sqzer` in type, with weaving fine lines behind it in a free form or a rectangle: no circle, no depth, no tie to the target. It is drawn as inline `<svg>` in `site/`. The Audio-Technica mark is not lifted or echoed. The lines are a shared vocabulary, their mark is not.

### D9. The accessibility floor

Taken from what the references get wrong. Drag is never the only way to do anything. Every control is a native element or has the role, name and keyboard behaviour of one. Every icon button has an accessible name. Status and errors are announced. The page holds at 320 px wide, under `prefers-reduced-motion` (the chart shows the finished state, without drawing in), and in light and dark.

### D10. A borrowed design system, chosen separately

The page borrows a design system rather than invent one, as the notes say. Which one is its own record, after its own survey, and it is chosen within the rules this repository already has. It is adopted as tokens and patterns copied into `style.css`, not as a package, because the page has one dependency. It has no web fonts from another host, because the CSP has no font source. Its licence is MIT or Apache-2.0 compatible. The type is the system's or a woff2 file in `site/`. Until that record exists, this one fixes behaviour and layout, not colour, type or spacing.

---

## 3. Options considered

**Keep the command-line block as the result** (parked D6). Rejected by the notes: it is cluttered for the reader who only wants the size. The raw record stays one click away for bug reports.

**Squoosh's codec panels, or an advanced expander** for `effort`, `subsampling` and `codecOpts`. Rejected: the one control is the product, and the command line covers the rest. Every option the page shows is one more reason two people get different bytes for the same file.

**A target file size**, as MAZANOKE, Moda and Upsampler do. Not available: the package searches a score, not a size. It would be a change to `sqzer` first, and it fights the product's idea that the same score is the same look on any image.

**Vendor `img-comparison-slider`.** Rejected: it would be a second dependency, and a range input over two clipped images already does the same.

**A percent progress bar.** Rejected: the budget is a maximum, not a count. A bar would jump from 50 % to done on most images.

**Batch and ZIP download**, as Pic Smaller, MAZANOKE, TinyPNG and iLoveIMG have. Deferred, not rejected: ADR-0011 D6 does not ask for it, and one image on the whole screen comes first. The session chart of D4 is the place it would show.

**Sample images to try.** Open: Squoosh's labelled samples let someone try the page with no file of their own, while the 1.8 MB package loads. They would be files in `site/`, encoded by `sqzer`, with their sizes shown.

---

## 4. Trade-offs

**The image on the whole screen against the controls.** Floating panels cover part of the picture the reader is judging. They can be collapsed, and the split stays usable under them. A layout with a side column would never cover the image, but it would show it smaller.

**Words against precision.** "70, high" is an average observer at 1:1. For some images 70 will look worse than the words say, and the words are the metric's, not ours. The number is always printed next to them.

**Zoom against simplicity.** Synced zoom and pan is the most code the redesign adds to `main.js`, and the parked build left it out for that reason. Without it the target cannot be judged on a large image.

**A chart without size against the notes.** The notes ask for size, and the package does not report it per trial. The chart ships with quality and score and gains size after a release of `sqzer`, not through a workaround here.

---

## 5. Consequences

What becomes easier: the page says what the score means in its own published terms, so the target needs no explainer copy. The result reads at a glance, and the raw record is one click away for an issue. The privacy claim becomes something a reader can test.

What becomes harder: `main.js` owns zoom and pan, the floating panels and the chart. Each has to hold at 320 px wide and at 24 megapixels. Error copy has to cover every error kind and stay true as the package adds formats. The design system record blocks the visual work.

What to revisit: whether readers find the alternatives to the target, and whether the session chart reads as a record of their files or as decoration.

---

## 6. Action items

1. [ ] `sqzer-dev/sqzer`: the size of each trial in `Trial` and `TrialProgress`, so the chart of D4 can draw it. An issue there, then a version bump here.
2. [ ] A survey of design systems against D10, and the record that picks one.
3. [ ] The empty state of D1 and the full-screen comparison of D2: centred handle, synced zoom and pan, pixelated view, background toggle.
4. [ ] The target control of D3, with lossless where `codecs()` has it.
5. [ ] The trial list, cancel and chart of D4.
6. [ ] The result panel of D5, the error sentences of D6 and the privacy note of D7.
7. [ ] The wordmark of D8.
8. [ ] A `/selftest/` line for anything in D2 that depends on the browser, under the `browser-check` rule.
9. [ ] Close pull request 1 once this record is accepted. Its branch stays as the record of what was tried.

---

## Open

- Sample images (section 3).
- The equivalent command line for the current settings, as the parked build printed it: in the details of D5, or not at all.
- Layout at phone width beyond "the image is the whole screen": where the panels dock and how they collapse.
- Colour, type and spacing, under D10.
- Whether the session chart is kept after a reload. It would be `localStorage`, on this device only.

---

## Sources

- Pull request 1, `feat/design`, the notes at its top: https://github.com/sqzer-dev/sqzer.dev/pull/1
- ADR-0011 D6, `sqzer-dev/sqzer`: https://github.com/sqzer-dev/sqzer/blob/main/docs/adr/0011-browser-build.md
- `crates/sqzer-wasm/src/output.rs` in `sqzer-dev/sqzer`, for `Output`, `Trial` and `TrialProgress`
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
