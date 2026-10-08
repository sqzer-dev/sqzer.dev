# ADR-0006: Blue on the border of a drop target

**Status:** Accepted   **Date:** 2026-10-07   **Deciders:** Vlad (sole maintainer)
**Scope:** One colour: what the page shows while a file is dragged over it. ADR-0003 D4 made the page monochrome with red for alerts and nothing else; this record adds a second hue for a second purpose. Nothing else in ADR-0003 changes.

---

## 1. Context

The empty state of ADR-0001 D1 is one large drop target, and the page with an image on it takes a drop anywhere. While a file is dragged over the window, the target has to say so. The first cut of issue 13 did it in grey: the target's dashed border went from `gray 10` to the ring's `gray 10` and its fill to `gray 3`, which reads as a hover, not as an invitation, and on the image the workspace's outline did the same.

The maintainer asked for a blue accent on the border instead, and no change of fill. Radix Colors ships `blue` in the same package as `gray` and `red`, light and dark, so it costs no dependency. Its step 9 is the solid of the scale, the one Radix means for a thing to be seen, and it measures 3.2:1 on `gray 1` in light and 5.8:1 in dark, above the 3:1 that WCAG 1.4.11 asks of a line that marks a control.

---

## 2. Decision

### D1. `blue 9` on the border, while a file is dragged, and nowhere else

The page gains one token, `drop`, which is Radix `blue 9` in light and dark. It goes on the dashed border of the drop target in the empty state and on the dashed outline of the workspace while a file is dragged over the page, and comes off when the drag ends. The fill under it does not change. Blue appears nowhere else: not on a focus ring, not on a link, not on a chip.

With red, that makes two hues on a grey page, each for one meaning: red says something went wrong, blue says a drop is welcome here.

---

## 3. Options considered

**Grey, as in the first cut.** Rejected by the maintainer: a darker border and a filled target read as a hover state.

**The ring's colour, `gray 10`.** The same problem, and the ring means focus.

**A tint of the fill.** Rejected: the maintainer asked for the border alone, and a tinted fill under a 2 px dashed line draws the eye to the area rather than to the edge the file is about to cross.

---

## 4. Consequences

- ADR-0003 D4 stands with one exception, written here. The rule in `.greptile/config.json` names the `drop` token as the one place for blue, and `CLAUDE.md` says the same.
- The blue scales are imported into `src/app/style.css` next to the red ones, and the build moves their dark halves under `prefers-color-scheme` as it does the others.

---

## 5. Action items

1. [x] The `drop` token and the two borders, in the pull request of issue 13.

---

## Sources

- ADR-0001 D1 and ADR-0003 D4, in this directory
- Issue 13: https://github.com/sqzer-dev/sqzer.dev/issues/13
- Radix Colors, the scale: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- WCAG 2.2, non-text contrast: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
