# ADR-0003: The design system, the components and the styling

**Status:** Proposed   **Date:** 2026-10-03   **Deciders:** Vlad (sole maintainer)
**Scope:** What ADR-0001 D10 left to its own record, on the stack of ADR-0002. It covers the headless component library, the styling system, the fonts, the colours, the glass panels, the icons, and the licences they bring. It also adds one directive to the Content-Security-Policy. What the page does and where things sit is ADR-0001, and nothing here changes it.

---

## 1. Context

ADR-0001 D10 asks for a borrowed design system and headless components, from a library of our own or a borrowed one. No packaged widgets. Nothing from another host at run time. Licences MIT or Apache-2.0 compatible. The maintainer's standards default to shadcn/ui on Tailwind, one styling system per app. ADR-0002 fixed React 19, Vite 8 and the policy `style-src 'self'`, with no `'unsafe-inline'` and no nonce, because the site is static and the policy is a `<meta>`.

That policy decides more than anything else here. A `<style>` element is blocked however it is created, whether by `createElement('style')` or by React 19's hoisted `<style href precedence>`. Styles written through the CSSOM are allowed: `el.style`, `setProperty`, `cssText` on `el.style`, and constructed sheets in `adoptedStyleSheets`. So a component library that injects `<style>` at run time is broken here, or needs working around.

### The libraries, as they stood on 2026-10-03

Each was installed from npm and its `dist` searched for `<style>` creation, inline style strings and scroll-lock helpers. Sizes are the full set the page needs, minified and gzipped with React external, and approximate.

```text
Base UI       `@base-ui/react` 1.8.0, MIT, the MUI team, pushed the day of the survey.
              every part the page needs, `Drawer` with snap points and `NumberField` included.
              one `<style precedence>`, for hiding a scrollbar in `Select` (on by default) and
              `ScrollArea`; `CSPProvider` takes `disableStyleElements` to turn it off. scroll
              lock is CSSOM only. about 108 KB
Radix         `radix-ui` 1.6.7, MIT, last commits 2026-07-31. no number field, no drawer.
              `Dialog`, modal `Popover`, `Select` and `DropdownMenu` lock scroll through
              `react-remove-scroll`, whose `react-style-singleton` calls `createElement('style')`
              on every open; `Select` and `ScrollArea` also render `<style>` inline. no way to
              turn it off without a nonce. about 50 KB, 59 KB with Vaul
Vaul          the drawer shadcn's Radix flavour uses. its README: "This repo is unmaintained".
              injects all of its CSS through `createElement('style')` when the module loads
Ark UI        `@ark-ui/react` 5.39.2, MIT, the Chakra team. every part the page needs, slider
              markers and a `Drawer` with a grabber included. only Zag's splitter creates
              `<style>`, and the page has no splitter. about 90 KB. no shadcn flavour: a
              registry pull request was closed unmerged on 2026-04-15, and the community ports
              have no stars and no licence field
React Aria    `react-aria-components` 1.21.1, Apache-2.0. no drawer. `usePress` injects a
              `<style>` on the first pressable unless an element with its id exists; modal
              locks inject one on iOS Safari with no way to turn it off. about 86 KB
Headless UI,  no slider, number field, toast or drawer
  Ariakit
```

shadcn/ui has made Base UI its default base since July 2026, and its Base UI flavour builds `Drawer` on Base UI "instead of Vaul". React Aria became a third base the same month, and Radix stays supported.

The maintainer has shipped shadcn with Ark UI swapped in for Radix on an earlier project. Ark is the cleanest under this policy with no setup at all. It lost here on one point: without a shadcn flavour, every component would be a port of our own, with no `shadcn add` updates after it.

### The design systems

The closest look to ADR-0001 is Vercel's Geist: monochrome, fine, dense. Only its fonts are licensed. The `geist` package is OFL-1.1, while the design system's colours and components carry no licence and ship no tokens. The rest, as surveyed:

```text
Radix Colors  `@radix-ui/colors` 3.0.0, MIT. 12-step scales, light and dark, alpha and P3
              variants, `blackA` and `whiteA` overlays, all as CSS variables. step 1-2
              backgrounds, 3-5 states, 6-8 borders and focus, 9-10 solids, 11-12 text. its steps
              map almost one to one onto Geist's
Geist fonts   `geist` 1.7.2, OFL-1.1. `Geist-Variable.woff2` 69.7 KB and `GeistMono-Variable.woff2`
              71.4 KB. checked: Geist Sans has tabular figures (`tnum`), Geist Mono is fixed
              width, both cover Cyrillic with the Ukrainian і, ї, є and ґ
shadcn tokens semantic pairs (`background`/`foreground`, `card`, `popover`, `muted`, `border`,
              `ring`) as CSS variables, read by Tailwind 4 through `@theme inline`. the contract
              the borrowed colours plug into. no glass, no rules for contrast over images
Apple HIG     Liquid Glass, as guidance: a layer for controls, never content; for components
              over photos, "consider adding a dark dimming layer of 35% opacity"; thicker
              material where text sits; Reduce Transparency and Increase Contrast as settings
Fluent 2      acrylic, as guidance: transient surfaces, no two panes side by side, no accent
              text on it, and a solid fallback when transparency is off, on battery saver, on
              low-end hardware and in high contrast
Primer        `@primer/primitives` 11.10.0, MIT. the most complete high-contrast themes, a
              model for `prefers-contrast: more`
Carbon,       Apache-2.0 and OFL, borrowable, and further from the look: Carbon flat and
  Material      corporate, Material tonal and colour-led, with `@material/web` in maintenance
```

### Glass over an image

ADR-0001 D2 puts every control in glass panels over the reader's own image, which can be anything, a white page or a black sky. WCAG measures text contrast against the worst background, and blur does nothing over a flat area. By plain alpha blending, a dark panel needs about 57 % tint to keep near-white text at 4.5:1 over pure white, and a light panel about 54 % over pure black. That is arithmetic, not a published figure, and it puts the tint at 60 to 75 %, far above the 10 to 30 % glassmorphism usually shows. NN/g's review of Liquid Glass says it flatly: "text on top of images is a bad idea".

`backdrop-filter` is Baseline, newly available since 2024-09-16. It makes a stacking context and a containing block, so a popover rendered inside a panel is clipped by it; Base UI renders popovers through a portal. Nested backdrop filters blur twice. The blur repaints whenever what is under it changes, which on this page means every drag of the split, every zoom and every pull of the bottom sheet.

---

## 2. Decision

### D1. shadcn/ui on Base UI, styled with Tailwind 4

The components are shadcn/ui's Base UI flavour, the default of `shadcn init`, on Tailwind 4. They are source copied into `src/shared/ui/`, one entry per component as ADR-0002 D5 says, and upgraded through `shadcn add`. What shadcn does not have, such as zoom and pan, the chart and the corner labels, is written on the same tokens and the same Base UI parts. The target slider's marks are positioned by our CSS, since Base UI's `Slider` has no marks part.

Tailwind 4 is the one styling system: the `@tailwindcss/vite` plugin, utilities in markup, and plain CSS in `@layer` only where a utility cannot say it (`@font-face`, `::view-transition-*`, the glass fallbacks of D5). No CSS Modules, no CSS-in-JS, no second component library.

### D2. Base UI under the policy

The app root is wrapped in `<CSPProvider disableStyleElements>`, and the stylesheet carries the two rules Base UI would otherwise inject:

```css
/* Base UI's scrollbar hiding for `Select` and `ScrollArea`, which `disableStyleElements` turns off */
.base-ui-disable-scrollbar { scrollbar-width: none; }
.base-ui-disable-scrollbar::-webkit-scrollbar { display: none; }
```

After that, scroll lock, the drawer, select, popovers and tooltips write styles only through the CSSOM. Every library positions its floating parts through React's `style` prop. That is allowed for an app that renders in the browser, but it becomes a blocked `style="..."` attribute in prerendered HTML. So the page stays rendered in the browser, and prerendering under ADR-0002's Open item is limited to a shell with no library component in it.

The Playwright suite of ADR-0002 D6 listens for `securitypolicyviolation` on every page it opens and fails on any. That is the check that a blocked style never goes unnoticed, and it is the browser check this record could not make.

### D3. Geist Sans and Geist Mono, from our own origin

The two variable fonts come from the `geist` package, bundled by Vite into hashed files and declared with `@font-face` and `font-display: swap`. Geist Sans is the type of the page. Geist Mono is every number the reader compares: the sizes, the score, the trials, the corner labels and the chart's labels. Where a number sits in Sans, it takes `tabular-nums`.

The policy gains one directive, `font-src 'self'`. It is the only change to ADR-0002 D3's policy, and it names no origin but our own.

### D4. Radix Colors grey, mapped onto shadcn's tokens

The palette is Radix Colors `gray`, light and dark, with `blackA` and `whiteA` for everything translucent. It is imported from `@radix-ui/colors` as CSS and mapped onto shadcn's semantic tokens in `@theme inline`:

```text
background   gray 1          muted        gray 3          border      gray 6, dividers only
card         gray 2          muted text   gray 11         ring        gray 10
foreground   gray 12         input        gray 10         glass tint  blackA / whiteA, D5
```

A line that marks where a control is (a field, a chip, a slider track, the focus ring) is `gray 10`, because WCAG 1.4.11 asks 3:1 of it. A line that only divides is `gray 6`. Against `gray 2`, the opaque surface of D5, the steps measure:

```text
light   gray 7  1.49   gray 8  1.82   gray 9  3.15   gray 10  3.60
dark    gray 7  1.92   gray 8  2.80   gray 9  3.45   gray 10  4.15
```

`gray 9` passes in light by a hair, so the floor is `gray 10`.

Light and dark follow `prefers-color-scheme`, as ADR-0002 D3 has it, with no script. There is no hue: the page is monochrome, as ADR-0001 wants. Whether alerts take one is under Open.

### D5. One glass, with its fallbacks

Glass is one Tailwind utility, `glass`, for the surfaces that float over the image on their own: the panels, the bottom expander and the corner labels. Nothing inside them is glass. The chips, the fields and the alert sit on the panel's surface with a plain 1 px border at `gray 10` (D4) and no fill of their own. Its rules, taken from Apple's and Fluent's guidance:

```text
where        controls only, never content. one level deep: no glass inside glass
tint         the panel's own `blackA` (dark) or `whiteA` (light) at the opacity the contrast
             check below settles, starting at 70 %. no accent colour on it
blur         moderate and fixed. the same radius everywhere
edge         a 1 px border at gray 6 in alpha. no shadow
popovers     rendered through Base UI's portal, outside the panel
```

Each fallback makes every glass surface opaque at `gray 2`, its outer edge at `gray 8`:

```css
@supports not (backdrop-filter: blur(1px)) { /* opaque */ }
@media (prefers-contrast: more) { /* opaque, control borders at gray 11, after Primer's high-contrast themes */ }
@media (prefers-reduced-transparency: reduce) { /* opaque. Chromium only, not Baseline */ }
@media (forced-colors: active) { /* `Canvas` and `CanvasText`, a real border */ }
:root[data-panels="solid"] { /* opaque, from the switch below */ }
```

`prefers-reduced-transparency` reaches the page only in Chromium. Firefox and Safari have no way to tell it the reader asked for less transparency, so ADR-0001 D9's fallback cannot rest on the media query alone. The control panel ends with a "Solid panels" switch that sets `data-panels="solid"` on `<html>`, in every browser. Where the media query matches, the switch starts on. The choice is kept in `localStorage`, on that device only, as a reader's convenience, and the page works the same if storage is unavailable. Glass appears only once an image is on the page, after the script has run, so the switch never has to act before first paint.

The tint is not chosen by eye. A test renders every glass surface (a panel with body text, a chip and a slider, the bottom expander, a corner label) over fixture images that are pure white, pure black and high-frequency noise, in light and dark. It samples the screenshot and requires 4.5:1 for text and 3:1 for the slider track, chip borders and focus ring, as WCAG 1.4.3 and 1.4.11 ask. The tint goes up until it passes.

### D6. Lucide icons

Icons are Lucide (ISC), the shadcn default, imported one by one so only the ones used are bundled. Every icon button has an accessible name, as ADR-0001 D9 asks.

### D7. The notices

The build ships a `licenses.txt`, linked from the footer, with the text of every licence the bundle carries: OFL-1.1 for Geist, MIT for Base UI, shadcn/ui, Radix Colors, React and the rest, ISC for Lucide. A pull request that adds a dependency adds its licence there.

---

## 3. Options considered

**Radix, the other shadcn flavour.** Rejected. `Select`, `Dialog` and modal popovers inject `<style>` on every open, and the only way around it is a nonce this page cannot have or a Vite alias over `react-style-singleton`. Its drawer is Vaul.

**Vaul for the bottom sheet.** Rejected: unmaintained, and its CSS reaches the page only through an injected `<style>`.

**Ark UI with a shadcn port of our own.** Clean under the policy with no setup, with slider markers built in, about 18 KB lighter, and the route the maintainer has taken before. Rejected for this page because there is no shadcn flavour for it: every component would be ours to port and to keep current, where Base UI gets `shadcn add`. Park UI, the Ark kit, is Panda CSS only, which breaks the one styling system.

**React Aria Components.** The strongest on accessibility, and a shadcn base since July 2026. Rejected: no drawer for the phone layout of ADR-0001 D2, a `<style>` on every first press unless an id is pre-seeded, and one on iOS modal locks with no way to turn it off.

**Headless UI and Ariakit.** Clean under the policy, but missing the slider, the number field, the toast and the drawer.

**Vercel's Geist design system.** The look this record aims at, but only its fonts are licensed. The colours come from Radix Colors instead, whose steps map onto Geist's.

**IBM Carbon, GitHub Primer, Material 3.** Borrowable under their licences. Carbon and Material are further from the look. Primer is kept as the model for high contrast in D5 and not borrowed whole.

**Apple's San Francisco fonts.** Licensed for Apple platforms only.

**A halo or text shadow for contrast on glass.** WCAG would count a wide halo as background, so it can pass, but it is a shadow on a matte page and covers for a tint that should pass on its own. Rejected.

---

## 4. Trade-offs

**Base UI's weight against Ark's cleanliness.** About 108 KB against 90 KB, plus one provider and two CSS rules that Ark does not need. In return the components stay on shadcn's maintained path.

**Glass against legibility.** At 60 to 75 % tint the panels read more as smoked than as clear glass. That is the price of text that stays legible over any image the reader drops, and the contrast test of D5 holds the line.

**Rendered in the browser only.** Prerendering anything with a library component in it would break the policy. The empty state can still get a static shell.

**Two font files.** About 140 KB on a first visit, both variable, both cached after.

---

## 5. Consequences

What becomes easier: the redesign of ADR-0001 builds on shadcn's components and gets their upgrades. The look comes from tokens with a named source, and every licence is known. A style the policy blocks fails a test instead of disappearing quietly.

What becomes harder: shadcn's components assume Radix's scroll lock and Vaul in places where the Base UI flavour has its own parts, so recipes from outside the Base UI docs need checking against D2. The glass utility and its fallbacks are ours to keep correct across four media conditions and a switch.

What changes elsewhere: ADR-0002 D3's policy gains `font-src 'self'`. ADR-0002's Open item on prerendering is limited by D2. The Greptile rules gain the policy rules for libraries and a rule for the one styling system.

---

## 6. Action items

1. [ ] `shadcn init` with the Base UI base on Tailwind 4 and Lucide, after ADR-0002's port, with the components into `src/shared/ui/`. The shadcn style is chosen then (Open).
2. [ ] `<CSPProvider disableStyleElements>` at the root, the scrollbar rules of D2, `font-src 'self'` in the policy, and the Playwright check for `securitypolicyviolation`.
3. [ ] The Geist fonts of D3 and the token mapping of D4, light and dark.
4. [ ] The `glass` utility of D5, its fallbacks, the "Solid panels" switch, and the contrast test of every glass surface over the white, black and noise fixtures.
5. [ ] `licenses.txt` of D7, linked from the footer.

---

## Open

- The shadcn style: Lyra, described as "boxy and sharp, pairs well with mono fonts", or Mira. Picked by looking at both on the real page.
- Whether alerts take a hue, Radix `red`, or stay monochrome with an icon and words.
- The blur radius, by measuring frame cost on a low-end phone while dragging the split.

---

## Sources

- ADR-0001 D2, D9 and D10, and ADR-0002 D3, D5 and D6, in this directory
- Base UI and its `CSPProvider`: https://base-ui.com/react/utils/csp-provider, https://www.npmjs.com/package/@base-ui/react
- shadcn/ui changelog, Base UI as default and React Aria as a base: https://ui.shadcn.com/docs/changelog
- shadcn/ui Base UI `Drawer`: https://ui.shadcn.com/docs/components/base/drawer
- Radix Primitives: https://github.com/radix-ui/primitives, `react-style-singleton`: https://github.com/theKashey/react-style-singleton
- Vaul: https://github.com/emilkowalski/vaul
- Ark UI: https://ark-ui.com, Zag.js: https://zagjs.com, the closed registry pull request: https://github.com/shadcn-ui/ui/pull/10406, Park UI: https://github.com/cschroeter/park-ui
- React Aria Components: https://react-spectrum.adobe.com/react-aria/
- Geist: https://vercel.com/geist/introduction, the fonts: https://github.com/vercel/geist-font
- Radix Colors: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- Apple HIG, materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Fluent 2, acrylic: https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic
- Primer primitives: https://primer.style/primitives
- NN/g on glassmorphism and Liquid Glass: https://www.nngroup.com/articles/glassmorphism/, https://www.nngroup.com/articles/liquid-glass/
- WCAG 2.2, contrast minimum and non-text contrast: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html, https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- `backdrop-filter`: https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- Lucide: https://lucide.dev
