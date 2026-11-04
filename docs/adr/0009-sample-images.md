# ADR-0009: Images to try, floating around the empty page

**Status:** Accepted   **Date:** 2026-10-28   **Deciders:** Vlad (sole maintainer)
**Scope:** The sample images ADR-0001 section 3 left open: which, under what licence, where they sit on the empty page, and what pressing one does. ADR-0001 D1 put the wordmark, one line and the button in the middle of the drop target with nothing around them; D2 here floats three images around that middle. Nothing else in ADR-0001 to ADR-0008 changes.

---

## 1. Context

ADR-0001 section 3 kept sample images open: Squoosh's labelled samples let someone try the page without a file of their own. The maintainer took it up after `sqzer` 0.4.0, and chose the images over three rounds on 2026-10-28.

A sample has a job beyond decoration. The three show the three things the page is for: a photograph whose smooth sky an encoder bands, a photograph large enough that zoom is how its artifacts are seen, and a graphic with transparency, which the package sends to lossless WebP.

```text
round 1     public domain from Wikimedia Commons, as the maintainer asked: a woodpecker, a diagram
            of a flower, Heinrich Berann's panorama of Yellowstone. Placements as tiles, links or chips
round 2     the maintainer's own picks from Commons' featured pictures, night skies, and something
            from mathematics for the graphic; placements floating around the middle
round 3     the Penrose tiling on Commons did not suit the dark theme in its colours, so the graphic
            is a Julia set drawn for the page; the floating placement, larger, looser, then
            half-way to the middle on a wide screen
```

---

## 2. Decision

### D1. The three samples

```text
aurora.jpg       "Zorza polarna, Lucim-01", Aneta p, CC BY 4.0. Resized to 2560 x 1707, re-encoded
                 by sqzer at quality 90: 562.3 KB
zhuque-2e.jpg    "Zhuque-2E propellant dump over Wisconsin", Brainandforce, CC BY 4.0. At its own
                 5488 x 3662, 20 MP, under the package's limit of 24, re-encoded by sqzer at quality
                 85 without its metadata: 2.1 MB
julia.png        the Julia set of c = -0.8 + 0.156i in eight blues, on transparency, drawn for the page
                 and cropped to its outline: 1194 x 688, 568.5 KB. MIT OR Apache-2.0, as the page
```

The two photographs ask for credit: the author, the licence, the source and what was changed. `public/samples/CREDITS.txt` says it, and the build appends it to `licenses.txt`, which the footer links. A CC BY-SA picture, Schenna at dusk, was left out: its share-alike would bind the resized copy too.

They are files in `public/samples/`, served from the page's own origin, so the policy is unchanged. The empty page loads a small copy of each, AVIF at twice the width it can be shown at, 16 to 41 KB; the file itself is fetched only when it is pressed.

### D2. They float around the middle of the drop target

The drop target is a grid: the middle, the wordmark, the line and the button, in its centre cell, and the samples in the cells around it, each leaning a few degrees and standing straight under the pointer or the focus. On a wide screen the aurora floats above and left of the middle, the Julia set below it on the left and the rocket below it on the right, each at the inner side of its cell, half-way from its corner to the middle. On a phone the aurora and the Julia set sit above the middle and the rocket below it.

Their size follows the window, `clamp` over the smaller of a share of its height and of its width, up to 36, 42 and 30 rem on a 2K screen. Each stays in its own cell, so none covers the middle, and the page holds to the window down to a laptop's 1280 x 680.

Each tile says its name and its size, `Aurora 562.3 KB`, under the picture, and the button's name is the same words.

### D3. Pressed, a sample is a picked file

Pressing a sample fetches it and hands it to the page as a picked file, and the workspace opens on it with the comparison, which is the preview. The tile is busy while the file comes. If it does not come, the tile says so as an alert, as every failure is (ADR-0001 D6), and can be pressed again; the page has nothing else to undo.

One download runs at a time, and the newest choice wins: a press ends the download before it, and the page moving on to an image, picked, dropped or pasted, ends any still under way, so a late sample never replaces the image on the page.

---

## 3. Options considered

**Public domain only.** The first round. The maintainer preferred night skies, which on Commons are CC BY; the credit costs a file the footer already links.

**A Penrose tiling, or a diagram from Commons.** The colours did not fit the dark, night-sky look. A Julia set drawn for the page has the colours chosen and no licence to carry.

**Tiles, a line of links, or chips under the button.** Drafted in round 1. Rejected for images floating around the middle, which use the empty page rather than lengthen its middle.

**Placed by absolute positions, or moved by a share of their own size.** Both covered the middle at some window sizes. The grid keeps each in its cell.

**A preview before opening.** A click could show the sample large, with its credit and a button to compress it. Rejected: the workspace's comparison shows it better, one click sooner.

---

## 4. Trade-offs

**3.3 MB in the repository**, of which the 20 MP photograph is 2.1 MB. It is fetched only by a reader who presses it.

**About 80 KB more on the empty page**, for the three small copies.

**A window shorter than about 620 px** grows the page a little past it on a wide screen: the middle and the samples need that much height.

---

## 5. Consequences

- ADR-0001 gets a `Superseded by` line for the sample images of section 3. Its row in `docs/adr/README.md` stays, and `.greptile/files.json` gets an entry for this record.
- `CLAUDE.md` names `public/samples/` in its layout and the credits in its licence rule.
- `vite.config.ts` appends `public/samples/CREDITS.txt` to `licenses.txt`. A sample replaced or added changes the file, its line in `CREDITS.txt`, and its entry in `model/samples.ts`, whose stated size `samples.test.tsx` checks against the file.

---

## 6. Action items

1. [x] The three samples, the floating tiles and the credits, in the pull request of this record.

---

## Sources

- ADR-0001 D1 and section 3, in this directory
- "Zorza polarna, Lucim-01": https://commons.wikimedia.org/wiki/File:Zorza_polarna,_Lucim-01.jpg
- "Zhuque-2E propellant dump over Wisconsin": https://commons.wikimedia.org/wiki/File:Zhuque-2E_propellant_dump_over_Wisconsin.jpg
- CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
