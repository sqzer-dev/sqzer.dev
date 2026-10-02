# ADR-0001: The design of the page

**Status:** Accepted   **Date:** 2026-10-02   **Deciders:** Vlad (sole maintainer)
**Scope:** The look and behaviour of the single page at `sqzer.dev`: feel, visual language, the controls, the result and the status line. What the page does, its file layout and its constraints are fixed by ADR-0011 D6 of `sqzer-dev/sqzer` and are not revisited here. Everything the discussion did not settle is listed under Open rather than decided quietly.

---

## 1. Context

The page runs the `sqzer` npm package in a Web Worker: one image in, a smaller one out that looks the same. A working version with a placeholder look is live at https://sqzer-dev.github.io/sqzer.dev/. It has every feature it will have for now. What it lacks is a look, and the discussion that produced this record settled the direction of that look and a handful of concrete rules, while leaving most of the measurements open.

Three facts about the page shape every decision below. The product's one idea is a perceptual target: a score, searched by up to six encodes, instead of a per-codec quality slider. Waiting is real, 45 s for an AVIF search on a 1600x1200 photo, so the page has to make the search visible rather than hide it. And the page sends nothing anywhere, which is a claim the design should make visible too.

The constraints that limit the design are listed in the brief and repeated here only where a decision leans on them: CSP allows the page's own origin and `cdn.jsdelivr.net` only, so no third-party fonts; no inline styles, no `data:` URIs; light and dark follow the system setting; the package is 2.4 MB over the wire, so the page's own assets stay small.

## 2. Decision

### D1. The feel

Matte black, monochrome, fine white line-art. The reference is not a web page: it is the Audio-Technica ATH-M50x limited edition earcup, an embossed mark inside a ring of thin concentric lines, and the matching panel of thin crossing lines over evenly spaced horizontal rules. The reason it fits is that the pattern is already a chart. Thin lines crossing a grid of rules is a rate-distortion curve; the lines wrapped around the ring are a gauge. The page draws its own data in that language, so the art is the product's numbers, not decoration borrowed from headphones.

The music side of that reference stays a motif and nothing more. The lines read as waveforms and cable runs on their own. The page never says "music", never shows a waveform icon, never names a producer audience. The moment it does, it stops being about images.

Dark is the primary design. Light exists because the system setting demands it, and its palette is not decided (see Open).

### D2. The search is the picture

The line-art is live. While a search runs, each trial appears as a point on evenly spaced horizontal rules, one rule per quality step, and a line segment joins it to the previous trial. When the search ends the line settles on the target rule. With the fixed-quality path there is one point and no line. Every mark on screen is a real number from the user's own file; nothing is drawn that did not happen.

The reason is the 45 s wait. A page that draws a point per trial reads as a page doing something; a spinner for 45 s reads as a page that hung. The second reason is that the chart is the ATH-M50x panel, so the hero art and the progress display are the same element and nothing on the page is purely decorative.

```text
rules       one horizontal line per quality step, evenly spaced, full width of the panel
trial       a point at (trial index, quality), labelled with its score
segment     joins consecutive trials, drawn as each trial lands
target      the rule the final point settles on; it is the only rule that is labelled
fixed       one point, no segment, no target rule
```

The drawing is inline `<svg>` built by `main.js` from the trial list the worker reports. Never a raster. An image optimizer whose hero is a 2 MB PNG of some lines is the first thing a reader will screenshot.

### D3. Where the fine lines are allowed

1 px white lines on black are the hero and the ring mark and nothing else. Reading text is plain light-on-dark type at normal weight. The hairline look is good for a picture and bad for a paragraph, and the status line, the numbers and the labels are paragraphs.

### D4. The target is the one control

The target score slider is the primary control and the page is built around it. 70 is 70 whether the output is AVIF or JPEG, which is the thing a per-codec quality slider can never say, and it is why the format can be a small choice below the slider rather than a panel above it. The fixed quality is the secondary path: present, because the package offers it and some inputs want it, but visually subordinate to the target.

No codec-specific options are exposed. The command line has `--codec-opt`; the page has one slider. Anyone who needs `avif:tune=ssim` has the CLI.

### D5. Defaults match the command line exactly

Same default target (70), same default fixed quality (80), same format choice for `auto`, same metadata policy. If `sqzer photo.jpg` and dropping `photo.jpg` on the page give different bytes, every bug report about either becomes a question about which one is right.

### D6. Numbers are printed the way the command line prints them

The result block keeps the current CLI format, in monospace:

```text
photo.jpg -> photo.jpg  464.6 KB -> 19.3 KB  -96%  jpeg q69 s70.6
1600x1200 -> 800x600  photo  jpeg -> jpeg (mozjpeg-rs)
target 70 reached in 1 trial: q69 s70.6
```

Raw output over reformatted output is a rule of the whole project, and this block is the thing a reader will paste into an issue. A table or a row of stat tiles would reshape the same numbers for no gain. The before and after sizes are also the only numbers that need to be visible at a glance, so they are the first line.

### D7. The comparison

The split slider over two stacked images stays, with the checkerboard under transparent ones. The target number is only convincing when you can see the two pictures in the same place, and a split is the one comparison that works from 48 px wide to 24 megapixels without zoom and pan, which are out of scope.

### D8. The wordmark is the ring

There is a wordmark: the `sqzer` mark inside a ring of fine concentric lines, the ring doubling as the target gauge. The geometry is generic enough, a circle in a ring with lines through it, and it is the one place the fine-line language appears outside the chart. The exact drawing is not decided (see Open). What is decided is the limit: the Audio-Technica logo itself is not lifted or echoed. The circle-in-ring and crossing lines are a shared vocabulary; their mark is not, and the page will be looked at by people who own those headphones.

### D9. Every image on the page is a demo

The page has no stock imagery of its own. If a sample image or an Open Graph image is added (Open), it goes through `sqzer` and shows its size next to it, so the one claim a reader can verify in DevTools is true of the page itself.

## 3. Options considered

A pre-recorded search on one fixed photo as the hero. Rejected: the live worker is the stronger story and the only one where every number on screen belongs to the visitor's own file.

A raster or canvas drawing of the lines. Rejected: an image optimizer's hero must not be a large image, and SVG from the trial list is smaller than any raster at every size.

Squoosh-style codec panels, or an "advanced" disclosure mapping to `--codec-opt`. Rejected for this page: the one-slider product is the point, and the CLI covers the rest.

Naming the music connection: a waveform icon, a line of copy about producers. Rejected: the motif works on its own and the words would narrow the audience to one hobby.

Reusing the Audio-Technica mark or its exact ring proportions. Rejected: generic vocabulary yes, their logo no.

A grid of stat tiles for the numbers. Rejected: it reshapes data the CLI already prints, and the project's writing rules say raw output over reformatted output.

## 4. Trade-offs

Hairlines against legibility. 1 px white on black is striking in a picture and unreadable as text, so D3 confines it to two elements. The cost is that the page has two visual registers, and the boundary between them has to hold in every component.

Live animation against reduced motion and against the cost of the search. The chart only earns its place because it moves as trials land. What it does under `prefers-reduced-motion` is not decided (Open). The search itself costs nothing extra: the trial list is already reported by the worker.

Monochrome against semantic colour. The brief asks for named tokens for smaller (good), larger (warning) and error. A strictly monochrome page has no hue to spend on them, so meaning would have to be carried by the sign, the words and the weight. Whether to admit one hue, or none, is not decided (Open).

Dark first against a system-driven light mode. Everything in this record was decided against black. A light palette that keeps the same line language is a separate piece of work, and until it exists the light mode is the placeholder it is today.

## 5. Consequences

What becomes easier: the hero, the progress display and the wordmark share one visual language and one drawing routine, so there is one thing to get right. The page never has to explain the perceptual target in copy, because the chart shows a search converging on a rule. Bug reports carry the CLI-format block, which is the same text the CLI prints.

What becomes harder: `main.js` owns an SVG builder that takes a trial list and a quality range, and that builder has to look right at phone width with six trials and at desktop width with one. The split between hairline art and plain text has to be enforced in `style.css` by hand, since there is no component library to do it. A light palette has to be designed, not derived.

What to revisit: whether the chart still reads as a chart once real users have seen it, and whether the fixed-quality path is used enough to deserve its subordinate placement.

## 6. Action items

1. [ ] SVG builder in `main.js`: rules from the encoder's quality range, a point per trial, a segment per pair, the target rule labelled. Draws from the trial list the worker already reports.
2. [ ] Move the current result block to monospace and keep its CLI format; make the first line the one that reads at a glance.
3. [ ] Confirm the page's defaults against `sqzer --help` and the CLI's `auto` format choice; add a test that the two agree on one fixture.
4. [ ] Draft the ring wordmark as inline `<svg>` within the limit in D8; decide its final drawing (Open).
5. [ ] Resolve every item under Open, each as a short amendment to this record or a new numbered ADR.

## Open

Not decided in the discussion. Each is Vlad's to settle.

Layout at desktop and phone width: where the controls sit relative to the picture, what moves when a file is loaded, and how the chart and the comparison share the viewport. The only fixed point is the brief's: in the empty state the drop zone is the page.

Typography: families and the scale. The constraints allow system stacks or committed font files; which, and the licence and file size of any committed file, are not decided. D6 requires a monospace face for the numbers and the status line, so a mono stack is needed whatever the choice.

Colour tokens with hex values for light and dark: background, surface, text, muted text, border, accent, smaller, larger, error. Dark is constrained by D1 to black, white and greys. Whether a single hue is admitted for smaller, larger and error, or the meaning is carried by sign and words alone, is not decided. The light palette is not designed at all.

Component states: the drop zone's three states, the format picker (select or segmented), the quality control's exact form (slider for the target is decided; how the fixed-quality alternative is switched to is not), the width field, the primary button, the error state, and the busy state over an old result while a new search runs.

Motion under `prefers-reduced-motion`: the chart draws as trials land (D2). Whether reduced motion shows each trial appearing without the segment drawing, or the finished chart only at the end, is not decided.

Copy: the headline, the privacy sentence, labels and hints. Only two rules were set: the word "music" and any waveform imagery do not appear (D1), and the privacy claim is made visibly (context).

Accessibility specifics: contrast ratios for the greys, the focus ring, touch target size. The constraints fix the floor (keyboard only, phone width); the numbers are not chosen.

The extras: favicon, Open Graph image, theme toggle, a sample image to try, the equivalent command line for the current settings, a link to install the CLI. A wordmark is decided (D8). If a sample or OG image is added it follows D9. The rest is undecided.
