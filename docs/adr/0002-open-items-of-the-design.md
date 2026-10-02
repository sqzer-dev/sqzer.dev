# ADR-0002: The open items of the design

**Status:** Proposed   **Date:** 2026-10-02   **Deciders:** Vlad (sole maintainer)
**Scope:** Every item ADR-0001 lists under Open, settled the way the first build of that design settles it, so the choices are on the record instead of only in `style.css`. Nothing in ADR-0001's decisions changes. Each choice below is Vlad's to accept or replace; merging this file accepts them.

---

## 1. Context

ADR-0001 fixed the feel and nine rules and left the measurements open. The page cannot be built without choosing them, so the build chose, and this record says what it chose and why. The choices were checked in Chromium 153 and Firefox 155 at 1280 and 390 pixels wide, in dark and light.

A fuller page in the manner of Squoosh is planned and will replace parts of ADR-0001, D4 first. Nothing here is meant to outlive that: these are the choices for the one-slider page.

## 2. Decision

### D1. Layout

```text
empty        header, headline, the drop zone at min(60dvh, 34rem), a matte plate with rules
             3rem apart, the status line. no controls
loaded,      two columns: the comparison on the left, a 22rem panel on the right
  >= 60rem   panel, top to bottom: chart, target slider, format, width, download
             under the comparison: status line, result block, the equivalent command
loaded,      one column: comparison, chart, target slider, format, width, download,
  < 60rem    status line, result block, the equivalent command
```

The chart sits directly above the slider because they are one statement: the slider says where the search should end and the chart shows it getting there. The comparison is never wider than the output's own pixels and never taller than 72dvh. The headline leaves when a file is loaded; the page is a tool from then on.

The controls are hidden until there is a file. The first encode therefore always runs with the defaults, which is the product's claim, and a control moved during it restarts it.

### D2. Typography

System stacks, no committed font: zero bytes, and nothing to license.

```text
reading     system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
numbers     ui-monospace, "SF Mono", "Cascadia Mono", "Segoe UI Mono", Menlo, Consolas,
            "Liberation Mono", monospace
scale       1rem body, 0.8125rem labels, hints, status and the result block,
            1rem for the first line of the result block, 2.5rem for the target's number,
            clamp(1.5rem, 1rem + 2.2vw, 2.5rem) for the headline
```

Monospace carries the status line, the result block, the command, the labels of the controls, the chips on the picture and the chart's labels. Everything else is the sans.

### D3. Colour

No hue. Smaller, larger and error are told by the sign (`-96%`, `+123%`), the word (`error: `, as the command line prints it) and the weight (the error line is bold). There are therefore no tokens for them, and no accent other than the text colour.

```text
token      dark       light      use
--bg       #0c0c0c    #f4f3ef    page
--surface  #161616    #e9e8e3    fields, buttons, the command block
--text     #e9e9e6    #151515    reading text, the primary button's fill
--muted    #9b9b97    #5c5c58    hints, labels, the lower lines of the result block
--border   #2e2e2e    #cbcac4    every edge of a component
--line     #ffffff    #000000    the line-art only (ADR-0001 D3)
--rule     0.2        0.22       opacity of a rule next to a line of data
```

Light is the same drawing on paper: black hairlines on a warm off-white. It is designed as an inversion, not as a second identity.

### D4. Components

```text
drop zone      empty: a plate of --surface, rules 3rem apart, interrupted by the words
               dragging: the rules go from 0.2 to 0.6 and the border to --text
               loaded: one row, the file's name and "choose another"
format         segmented, generated from `codecs()`. selected is --text filled
quality        the slider is the target. a checkbox under it, "a fixed quality, no search",
               turns the same slider into the quality. each mode remembers its value
               a lossless-only format disables both and says so
width          a number field with "px" next to it
primary        the download: --text filled, full width of the panel
error          "error: " and the package's message, bold. the result and the chart's data go
busy over an   the old result block and command at 0.45 opacity, the download without its
old result     link, the chip on the picture reads "after, previous settings", the seconds
               tick next to the status line, the chart starts empty and fills
```

### D5. The chart's measurements

The chart is a matte plate, `--surface`, 13rem tall. One rule per ten steps of quality, 0 to 100: 11 rules, close to the nine of the reference panel. A trial is a 2.5 px point with its score above it. Consecutive trials are joined by a curve that leaves one level and arrives at the next, as the lines of the reference do, not by a straight segment. The rule the search ended on is drawn at full opacity and labelled `target 70: q83`; the trial that was kept gets a ring. A fixed quality is one point in the middle labelled `q80`: there is no score to label it with. A lossless output draws nothing on the rules.

Before the first trial lands nothing has happened, so nothing is drawn. The seconds next to the status line are what moves.

### D6. Motion

The newest curve draws in over 0.4 s, and its point and score fade in after it. The ring follows the slider without a transition. Under `prefers-reduced-motion` each trial appears at once as it lands. The finished chart is not held back until the end: seeing trials land is the progress display.

### D7. Copy

```text
headline    Drop an image, get a smaller one that looks the same.
privacy     It is encoded in this tab. Nothing is uploaded.
footer      No analytics, no error reporting.
target      The smallest file that still scores this on SSIMULACRA2, found in up to six encodes.
quality     The encoder's own scale. One encode, no score.
width       Scales down to fit, never up. Empty keeps the size.
```

### D8. Accessibility

Text on `--bg` is 16:1 in dark and 15:1 in light; muted text is 7:1 and 6:1. The focus ring is 2 px of `--text` at a 2 px offset, on every control, and on the handle of the comparison while its slider has focus. Controls are at least 1.75rem tall, 2.75rem on a coarse pointer. The comparison is a native range and moves with the arrow keys. The chart is hidden from assistive technology: the status line announces each trial and the result block lists them.

### D9. The ring

The name in monospace on a disc, tone on tone, inside a band of six fine lines, 6rem across. The lines keep their distance and sway together, so they leave the band and come back into it, as the lines on the reference earcup do. The band is the gauge: the lines run clockwise from twelve o'clock as far round as the target is high, so 70 is 70 % of the way. With a fixed quality or a lossless format there is no target and no lines. `main.js` draws them. The favicon is a plain ring, three circles and an arc.

### D10. The extras

```text
favicon              yes, `site/icon.svg`, 0.4 KB
equivalent command   yes, under the result block: `sqzer photo.jpg -f jpeg -t 70 --width 800`
link to the CLI      yes, in the sentence above that command
Open Graph image     no. it would be a raster, and ADR-0001 D9 asks more of one than a logo
theme toggle         no. the system setting decides
sample image         no
```

## 3. What ADR-0001 D5 can and cannot promise

The page's defaults are the package's: `/selftest/` checks that `{ target: 70 }` and no options at all give the same bytes. A portable build of the command line gives those bytes too: checked by hand on `pattern-rgb.jpg`, 345 bytes of AVIF, identical.

The release binaries do not. They carry the native tier, so `sqzer photo.jpg` from Homebrew writes its AVIF with another encoder than `ravif`, and the bytes differ from the page's for the same settings. The sentence above the equivalent command therefore says "the same settings", not "the same file". The command line has no default for `-q`, so the 80 the slider starts at in the fixed mode is the page's own.

## 4. Action items of ADR-0001

1. Done: `draw` in `main.js`, with curves where ADR-0001 D2 says segments.
2. Done.
3. Done as far as this repository goes: the `defaults` line of `/selftest/`, and the comparison with a portable build above. The release binaries differ, see section 3.
4. Drafted, D9. The final drawing is Vlad's.
5. This record.
