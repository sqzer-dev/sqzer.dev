# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

The page at `sqzer.dev`: a single-page application that runs the `sqzer` npm package in the browser. The package is built from `crates/sqzer-wasm` in `github.com/sqzer-dev/sqzer`, and its API is that crate's `README.md`. The decisions behind the page are in `docs/adr` here, on top of ADR-0011 D6 in that repository's `docs/adr/0011-browser-build.md`. This repository holds the page only.

Solo-maintained. React 19 and TypeScript, built by Vite, with the search as an XState machine (ADR-0002, ADR-0004). The components are shadcn/ui's Base UI flavour, styled with Tailwind 4 on tokens from Radix Colors, in Geist (ADR-0003). The build is static files: no server, and no router until there is a second page.

The page moves on its own cadence, apart from `sqzer`: the look, the controls, quality-of-life features and anything else on top of the package's public API happen here, in pull requests that deploy on merge. What the package cannot do, a format, an option, a decoder, is a change to `sqzer` first and a version bump here after its release. Never work around a gap in the package on the page.

## Layout

```
index.html                  the entry Vite builds. The Content-Security-Policy is added at build
vite.config.ts              the build, and the one place the policy is written
components.json             what `shadcn add` reads: the Base UI base, the Mira style, where components go
src/app/                    the root and `style.css`: the tokens, the fonts, the `glass` utility
src/pages/compress/ui/      the page and its parts: drop zone, controls, status, comparison, result
src/pages/compress/model/   the search machine, the worker actor, the picked image, the result
src/pages/compress/lib/     drawing on the page, codec lookups, the summary, reading the controls
src/shared/api/sqzer/       the worker, its client and the message types. Every call into `sqzer`
src/shared/ui/              the components, one file each, copied in by `shadcn add`. No barrel
src/shared/lib/             small helpers, named by their domain
tests/e2e/                  the Playwright suite, against the built page
tests/fixtures/             the images both suites use
package.json                `sqzer` and the tooling, at exact versions, bumped by Dependabot
pnpm-workspace.yaml         pnpm's settings: the Next peer of `geist` is optional, so Next is not installed
.greptile/                  what the reviewer reads and the rules it checks against
docs/adr                    decisions. Add a new numbered file, never edit an accepted one
```

Vitest tests sit next to what they test, as `*.test.ts` and `*.test.tsx`.

`CONTRIBUTING.md`, `SECURITY.md`, the issue forms and the PR template mirror `sqzer`'s, adapted to a page: questions go to `sqzer`'s Discussions, bugs in the output go to `sqzer`, security reports come here. `CODE_OF_CONDUCT.md` and `LICENSE-*` are verbatim third-party texts: never edit them for style.

## Rules

- `sqzer` is a dependency at an exact version, installed by pnpm from the committed `pnpm-lock.yaml`, bundled by Vite and served from the page's own origin. Never a range, a URL import or a checkout of `sqzer`. `package.json` and the lockfile are the only places the version is written.
- The page sends nothing anywhere: no analytics, no error reporting, no request to another origin. The `Content-Security-Policy` in `vite.config.ts` says so; do not widen it for convenience. No inline script, no `style` attribute, no `<style>` block, and a React `style` prop sets custom properties only.
- Tailwind 4 is the one styling system: utilities in markup, and plain CSS in `src/app/style.css` only where a utility cannot say it. No CSS Modules, no CSS-in-JS, no second component library. A component comes from `shadcn add` into `src/shared/ui/` and is then ours: fields and chips take a `gray 10` border and no fill, the focus ring is solid, and nothing carries a shadow or a colour outside the tokens (ADR-0003 D4).
- Nothing makes a `<style>` element at run time: the policy blocks it. The root stays in Base UI's `<CSPProvider disableStyleElements>`, and a new library is checked for it before it is added. The Playwright suite fails on any `securitypolicyviolation`.
- The palette is Radix `gray`, with `red` on an alert and nowhere else. Light and dark follow `prefers-color-scheme`, with no script and no `.dark` class: the build moves Radix's dark scales under the media query.
- Glass is the `glass` utility and nothing else, on what floats over the image on its own: the panels, the bottom expander, the corner labels. Nothing inside glass is glass. Its tint is whatever `glass.test.tsx` passes at, never a value chosen by eye, and a new glass surface joins that test.
- Every call into `sqzer` runs in the worker. The package is synchronous, and a search takes seconds. Only the client in `src/shared/api/sqzer/` starts or ends a worker, and only the search machine uses the client.
- A search cannot be interrupted. The machine's `restart` re-enters its `open` state, which ends the worker and starts another; keep that the only way an encode is cancelled. An idle worker is never ended: it holds the decoded image, so a change of the controls only pays for the encode (ADR-0004).
- The package's decoder comes first, the browser's canvas decodes what the package cannot. An SVG is drawn on the page from an `<img>`, at the size asked for: `createImageBitmap` refuses an SVG blob inside a worker in Chrome and Firefox.
- What the format list offers comes from `codecs()`. Do not hardcode formats or backends.
- Never write a decoder, encoder, resampler or metric here. If the package lacks something, that is a change to `sqzer`.
- Code sits in `src/pages/compress/` until a second place uses it, then it moves to the layer Feature-Sliced Design names for it (ADR-0004 D4). Imports go to lower layers, through a public `index.ts`.
- The checks are strict on purpose. A lint rule is turned off only in `.oxlintrc.json`, with its reason next to it, and a `tsconfig` flag is not loosened to make a change pass.
- Licence: MIT or Apache-2.0, and a new dependency states its licence in the pull request. The build writes `licenses.txt`; what reaches the page as a stylesheet or a font is listed by hand in `UNLISTED` in `vite.config.ts`. When the page switches to the AGPL build of `sqzer`, the repository becomes AGPL-3.0 (ADR-0011 D6). Do not import AGPL code before that switch is made deliberately.

## Commands

```sh
pnpm install                   # pnpm is pinned by `packageManager` in `package.json`
pnpm dev                       # the page at http://localhost:5173, without the policy
pnpm build && pnpm preview     # the built page at http://localhost:4173, with the policy
pnpm format                    # oxfmt, in place
pnpm exec shadcn add <name>    # a component into `src/shared/ui/`, then `pnpm format` and the token rules above
```

`check.yml` runs the `browser` job on every pull request, and `pnpm check` runs the same locally:

```sh
pnpm typecheck      # tsc over the page and over the configs and end-to-end tests
pnpm lint           # oxlint, type-aware, with the React Compiler rules of `eslint-plugin-react-hooks`
pnpm format:check   # oxfmt
pnpm fsd            # Steiger: the layers and the imports
pnpm test           # Vitest in browser mode, in Chromium and Firefox
pnpm test:e2e       # Playwright against `vite build` served by `vite preview`, in Chromium and Firefox

# the two test suites need the browsers once
pnpm exec playwright install --with-deps chromium firefox
```

A change to a path that depends on the browser, the canvas fallback, `decodeAny` or the comparison, gets a Vitest test next to it. Component tests load `src/app/style.css`, so a component is tested as it looks. Beyond the suites, a change to the look is checked by loading the page in Chrome and Firefox. Safari needs Apple hardware; ask.

## Workflow

- `main` deploys: `pages.yml` builds the page and publishes `dist/`. Work on a branch, open a PR, squash-merge. A ruleset on `main` requires a pull request, the `browser` check green, every review thread resolved, linear history and squash merges only; there is no bypass, so nothing is pushed to `main` directly.
- Conventional commit prefixes: `feat: ...`, `fix: ...`, `ci: ...`, `docs: ...`, `chore: ...`.
- Greptile reviews every PR (`.greptile/config.json`); Dependabot's are excluded. A new ADR gets an entry in `.greptile/files.json` and an update to any rule it changes, same PR.
- After a release of `sqzer`: merge the Dependabot PR once its check is green, or set the version in `package.json` and run `pnpm install`.

## Writing style for anything user-facing

The same as in `sqzer`: sentence case headings, short prose then a fenced block, backticks on every identifier, no em dashes, no emoji, no tables, uncertainty stated flatly.
