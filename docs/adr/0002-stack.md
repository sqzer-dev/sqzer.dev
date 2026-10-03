# ADR-0002: The stack

**Status:** Accepted   **Date:** 2026-10-03   **Deciders:** Vlad (sole maintainer)
**Scope:** What the page is built with: the framework, the language, the bundler, the React APIs the page leans on, how the search's state is held, how `sqzer` reaches the page, the Content-Security-Policy under a build, the source layout, the checks, the deploy and the dependency updates. The design system, the component library and the styling system are ADR-0003 (ADR-0001 D10). What the page looks like and does is ADR-0001, and nothing here changes it.

---

## 1. Context

The page is plain HTML: `site/index.html`, one ES module (`site/main.js`, 372 lines), one worker script (`site/worker.js`, 77 lines), one stylesheet, no build step. That was decided in `sqzer` by ADR-0011 D6, and this repository's `CLAUDE.md` repeats it, along with "no dependency other than `sqzer`". It fit a placeholder page that had to exist on the day the package shipped.

ADR-0001 asks for more than that page can comfortably hold: glass panels, synced zoom and pan, a bottom expander, an Advanced panel built from `codecs()`, a live chart, chips that collapse, alerts, and a borrowed design system with headless components. Its review set the direction. The "one dependency" rule goes, and this record proposes a framework and a bundler.

The page is also where the maintainer wants to work with something new. The review of the first draft of this record asked for three things on top of the familiar stack: bleeding-edge tooling, React's newest APIs, and a state machine for the search. Each is checked below and decided in D1, D6, D9 and D10, with the stable tool named as the fallback wherever the new one is not stable yet.

### The maintainer's standards

The maintainer works in React and keeps a written set of web standards. They assume React 19 with TypeScript, Vite and Feature-Sliced Design, and the parts that bear on this record are these:

```text
react        React Compiler on, no hand memoization by default. no effect where a derived
             value or an event handler does. state in the narrowest place that works
typescript   `strict`, `verbatimModuleSyntax`, `erasableSyntaxOnly`. no `enum`. `tsc --noEmit`
             in CI, because Vite strips types without checking them
structure    Feature-Sliced Design: import only from lower layers, through a slice's
             `index.ts`; barrels per slice only; boundaries enforced by a tool (Steiger)
deps         every dependency is a risk. commit the lockfile, install from it unchanged in CI.
             wrap a third-party API behind one adapter. the package manager is pnpm
tests        Vitest and React Testing Library by role and text; few end-to-end tests
styling      default for a new project: shadcn/ui on Tailwind. one styling system per app
browsers     Baseline features only in production. Firefox is the main development browser
```

### What was checked

Versions on npm on 2026-10-03:

```text
react, react-dom              19.3.0     MIT
vite                          8.3.2      MIT    builds with Rolldown
@vitejs/plugin-react          6.1.1      MIT
babel-plugin-react-compiler   1.0.0      MIT
@rolldown/plugin-babel        0.2.4      MIT
oxc-transform-react           0.145.x    MIT    0.152.0 is out; the plugin's peer range is ^0.145.0
typescript                    7.0.2
oxlint                        1.86.0     MIT
eslint-plugin-react-hooks     7.1.1      MIT
vitest                        5.0.3      MIT
@vitest/browser-playwright    5.0.3      MIT
vitest-browser-react          2.3.0      MIT
@playwright/test              1.63.0
xstate                        5.33.2     MIT
@xstate/react                 6.1.0      MIT
sqzer                         0.3.0      MIT OR Apache-2.0
pnpm                          12.8.1     MIT    lockfile format 9.0
```

`@vitejs/plugin-react` 6 runs React Compiler two ways. `react({ compiler: true })` uses `oxc-transform-react`, a Rust port, which its README marks experimental. `reactCompilerPreset()` runs the Babel compiler through `@rolldown/plugin-babel`, and that is the stable path. In the prototype below, both compiled the component, memo cache and all, into byte-identical bundles.

The newer pieces, as they stood on 2026-10-03:

```text
oxlint           native `react`, `react-hooks` and `typescript` rules, `set-state-in-effect`
                 among them. `eslint-plugin-react-hooks` runs inside it as a JS plugin under an
                 alias, `react-hooks-js`, for the React Compiler rules. JS plugins are alpha. In
                 the prototype, a planted `setState` in an effect and a missing dependency were
                 caught by both the native rules and the JS plugin
vitest browser   tests run in real Chromium and Firefox through `@vitest/browser-playwright`, not
                 in jsdom. no longer marked experimental in the Vitest docs. `vitest-browser-react`
                 renders components and queries by role and text, as Testing Library does
react 19.3       exports `ViewTransition`, `addTransitionType`, `Activity` and `useEffectEvent`
                 without an `unstable_` prefix
view transitions Baseline newly available since 2025-10-14: Chrome 111, Firefox 144, Safari 18
xstate 5         a machine with the worker as a callback actor, typed by `setup()`: `tsc` clean,
                 and 14 kB gzip on top of React (68.94 kB to 82.96 kB)
pnpm 12          the prototype installs, type-checks and builds to the same bundle as under npm.
                 Dependabot supports pnpm 7 to 12 and reads `pnpm-lock.yaml`
```

The published `sqzer@0.3.0` is `sqzer.js`, `sqzer.d.ts`, `snippets/` and an 8.1 MB `sqzer_bg.wasm`, which `sqzer.js` finds through `new URL('sqzer_bg.wasm', import.meta.url)`. A bundler that understands that pattern emits the wasm as a file of its own next to the code.

How the wasm travels, from where it is served today and from where it would be served under a build:

```text
jsDelivr       Content-Encoding: br     2,410,649 bytes   cache-control: max-age=31536000, immutable
GitHub Pages   Content-Encoding: gzip   about 2,610,000 bytes (gzip -6 of the same file)
               cache-control: max-age=600, with an ETag
```

GitHub Pages compressed `application/wasm` with gzip on a page checked the same day, `webassembly.github.io/wabt/demo/libwabt.wasm`, and serves no brotli. The same file from our own origin is about 8 % larger over the wire. Browsers partition their HTTP cache by site, so jsDelivr's copy is never shared with other sites, and the year-long `immutable` header is its only advantage on a repeat visit. Pages answers a repeat visit after ten minutes with a `304` against the ETag.

A prototype was built on 2026-10-03 with the versions above: a React root that starts a module worker, and the worker calls `init()` and `optimize()` from `sqzer` installed from npm. With the configuration in D3:

```text
tsc --noEmit             clean, under `strict`, `verbatimModuleSyntax`, `erasableSyntaxOnly`
vite build               index.html 0.51 kB, index.js 220.30 kB (68.94 kB gzip),
                         worker.js 13.27 kB, sqzer_bg.wasm 8,078.51 kB (2,646.97 kB gzip)
the built index.html     the CSP of D3 as its first `<meta>`, one `<script src>`, no inline script
the wiring               `new Worker(new URL('/assets/worker-<hash>.js', import.meta.url))` and
                         `new URL('/assets/sqzer_bg-<hash>.wasm', import.meta.url)`, both hashed
```

Not checked: the prototype running in a browser. Headless Chromium and Firefox do not start on the machine it was built on, which lacks their system libraries (`libnss3`, `libnspr4` and others) and has no `sudo` for this. The first run of the Playwright suite of D6 in CI is that check, and the port of action item 1 does not merge without it.

---

## 2. Decision

### D1. React 19 and TypeScript, built by Vite

The page is a React 19 application in TypeScript, built by Vite 8 with `@vitejs/plugin-react`. React Compiler is on through the Rust compiler, `react({ compiler: true })` with `oxc-transform-react`, pinned to the `0.145.x` that the plugin's peer range accepts. It is experimental, so the Babel compiler is the fallback: `reactCompilerPreset()` through `@rolldown/plugin-babel` is a two-line change in `vite.config.ts`, and the page goes back to it the first time the Rust one compiles something differently or breaks a build. TypeScript runs under `strict`, `verbatimModuleSyntax` and `erasableSyntaxOnly`, and `tsc --noEmit` runs in CI.

It is a single-page application with one route and no server: the build is static files, and there is no router until there is a second page.

### D2. `sqzer` from npm, served from the page's own origin

`sqzer` is a dependency in `package.json` at an exact version, installed from the npm registry by pnpm, with `pnpm-lock.yaml` committed and `pnpm install --frozen-lockfile` in CI. Vite bundles `sqzer.js` into the worker and emits `sqzer_bg.wasm` as a hashed file, both served from `sqzer.dev`. The page stops loading anything from jsDelivr, and `cdn.jsdelivr.net` leaves the Content-Security-Policy.

The version the footer shows comes from the package at build time, not from a second place it is written. `package.json` and the lockfile are still the only places that name it, and a Dependabot pull request is still the whole bump.

The price is about 200 KB more over the wire on a first visit, gzip where jsDelivr has brotli. In return the page talks to one origin, its own. "Nothing is sent anywhere" no longer needs an exception for a CDN, and the note behind "Don't trust us?" (ADR-0001 D7) quotes a policy with a single origin in it. The package's types come from `sqzer.d.ts` in the editor and in `tsc`.

### D3. The Content-Security-Policy, under a build

The policy is written once, in `vite.config.ts`, and a small plugin with `apply: 'build'` puts it into the built `index.html` as a `<meta>`. The development server does not get it, because Vite injects inline scripts for Fast Refresh there. The tests of D6 run against the built page, so the policy is tested where it is served.

```ts
// vite.config.ts, as in the prototype. the policy, with jsDelivr gone
const csp = "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; " +
  "connect-src 'self'; img-src 'self' blob:; style-src 'self'; base-uri 'none'; form-action 'none'";

export default defineConfig({
  plugins: [
    // React Compiler in Rust. the fallback: `react()` plus `babel({ presets: [reactCompilerPreset()] })`
    react({ compiler: true }),
    { name: 'csp', apply: 'build', transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' },
    ] },
  ],
  // no `data:` URIs: Vite inlines small assets as base64 by default, and the policy refuses them
  build: { assetsInlineLimit: 0 },
  // the worker is a module, and imports `sqzer` like any other module
  worker: { format: 'es' },
  // pre-bundling in development would move `sqzer.js` away from its `sqzer_bg.wasm`
  optimizeDeps: { exclude: ['sqzer'] },
});
```

Three rules keep the policy as strict as it is today:

- No inline script in `index.html`. The theme follows `prefers-color-scheme` in CSS, so nothing has to run before first paint. A theme toggle, if one ever comes, needs a hash in `script-src`, decided then.
- No `style` attribute in markup and no `<style>` block. A React `style` prop is set through the CSSOM, which `style-src 'self'` allows, but it is used only to set custom properties. State reaches CSS as `data-*` attributes and custom properties, and the stylesheet decides what they look like.
- `<meta charset>` comes before the policy in the built file. The prototype's plugin put the policy first; the real one inserts it after the charset.

### D4. One worker, behind one adapter

Every call into `sqzer` still runs in one worker, `src/shared/api/sqzer/worker.ts`, started with `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`. The message protocol is a set of TypeScript types in the same slice, shared by the worker and by its client. The client is the only thing that starts, ends or talks to the worker, and the search machine of D10 is the only thing that uses the client. Cancelling is still ending the worker and starting another, the only way an encode stops.

The canvas fallback stays where `CLAUDE.md` puts it: the package's decoder first, the browser's canvas for what it cannot read, and an SVG drawn on the page from an `<img>`.

### D5. Feature-Sliced Design

The source follows FSD v2.1, with the layers the page needs:

```text
src/app/                 the root, its providers, the global stylesheet
src/pages/compress/      the one page
src/widgets/             comparison, control-panel, search-chart, result-panel
src/features/            pick-image, encode-image, cancel-encode, download-result
src/entities/            image, codec, encode-result, trial
src/shared/api/sqzer/    the worker, its client and the message types (D4)
src/shared/ui/           the components of ADR-0003, one entry each, no root barrel
src/shared/lib/          small pure helpers, named by their domain
```

Each slice has a public `index.ts`, and imports go only to lower layers through it. Steiger checks it in CI. The slice names above are a starting point for the port, not a contract. The rule is the layers and the imports.

### D6. The checks

On every pull request, in the job still named `browser` so the ruleset on `main` needs no change:

```text
tsc --noEmit         the types
oxlint               native React, hooks and TypeScript rules, and `eslint-plugin-react-hooks`
                     as the JS plugin `react-hooks-js` for the React Compiler rules
steiger              the FSD boundaries of D5
vitest               browser mode, in Chromium and Firefox: units, components through
                     `vitest-browser-react` by role and text, the search machine of D10, and the
                     `decodeAny` checks of `/selftest/`, on the page and in a worker
playwright test      end to end, against `vite build` served by `vite preview`, in Chromium
                     and Firefox: one image through the page, a cancel, and the origin check
```

`/selftest/` and `.github/check.mjs` become these two suites, as ADR-0001 asked. The `decodeAny` checks need a real canvas and a real worker, and browser mode gives them both, so they move to Vitest unchanged in substance. Playwright covers what only the built page has: the policy of D3, and every request staying on the page's own origin, which is the proof behind ADR-0001 D7. Firefox joins Chromium because it is the main development browser and the canvas fallback differs between them. Safari is checked by hand, on Apple hardware, and nowhere else: the public `/selftest/` page goes with the move, and so does the README section that asks readers to open it and paste its lines into an issue.

oxlint's JS plugins are alpha. If the alias stops loading, the hooks rules still run natively, and ESLint with `eslint-plugin-react-hooks` is the fallback for the React Compiler rules alone.

### D7. The layout, the deploy and the updates

The repository root becomes the Vite project. `site/` goes.

```text
index.html                the entry Vite builds
src/                      D5
public/                   files served as they are: the icon, the samples if ADR-0001 adds them
tests/e2e/                the Playwright suite and its fixtures. Vitest tests sit next to what they
                          test, as `*.test.ts` and `*.test.tsx`
package.json              `sqzer` and the rest, at exact versions, and `packageManager: pnpm@12.8.1`
pnpm-lock.yaml            committed
vite.config.ts            D3
tsconfig.json             D1
```

`pages.yml` sets up pnpm from `packageManager` with `pnpm/action-setup`, runs `pnpm install --frozen-lockfile` and `pnpm build`, and uploads `dist/` instead of `site/`. `check.yml` installs the same way. Every merge to `main` is still a deploy.

Dependabot watches the root with its `npm` ecosystem, which covers pnpm and its lockfile, daily. `sqzer` comes alone, so a release of the package is one pull request with nothing else in it. The build and test tooling comes grouped, one pull request at a time.

### D8. Styling is ADR-0003

The design system, the component library and the styling system are chosen together in ADR-0003, after a survey, as ADR-0001 D10 says. That record starts from the maintainer's default, shadcn/ui on Tailwind, and has to meet ADR-0001 D10: headless components, nothing loaded from another host, licences MIT or Apache-2.0 compatible. Nothing in this record rules out that default: Tailwind 4 is a Vite plugin, and shadcn/ui is source copied into `src/shared/ui`.

### D9. React's newest APIs carry the motion and the panels

ADR-0001's changes of state are view transitions. Dropping a file turns the drop zone into the image, a result replaces the trial list, a panel collapses into the bottom expander. Each is wrapped in `<ViewTransition>` and named with `addTransitionType` (`drop`, `result`, `collapse`), and the stylesheet animates each type through `::view-transition-*`. The View Transition API is Baseline, newly available since 2025-10-14, and a browser without it changes state without the animation. Under `prefers-reduced-motion` the stylesheet turns the animations off.

Collapsed panels and the closed Advanced expander are `<Activity mode="hidden">`, not unmounted. What was typed into a field survives a collapse, and a hidden panel renders at low priority while the comparison has the main thread. `useEffectEvent` is the answer when an effect needs the latest value without re-running, as the standards say.

### D10. The search is a state machine

The search's lifecycle is an XState 5 machine in `src/features/encode-image/model/`: `empty`, `searching`, `result`, `failed`, with `cancel` going back to the state the search started from. Each run of ADR-0001 D4 is its context: the trials as they land, the result, the error kind.

The worker is a callback actor invoked by `searching`. The actor starts the worker, turns its messages into events (`trial`, `done`, `failed`), and returns a cleanup that terminates the worker. Leaving `searching` for any reason stops the actor, so a cancel, a new drop or a change of format during a search ends the worker. That is the rule in `CLAUDE.md`, now held by the machine instead of by care:

```ts
// the worker as an actor. stopping the actor ends the worker. in the prototype it called
// `new Worker` directly; in the page it goes through the client of D4
const encoder = fromCallback<Events, { bytes: ArrayBuffer }>(({ sendBack, input }) => {
  const worker = startEncoder({ onMessage: (message) => sendBack(toEvent(message)) });
  worker.encode(input.bytes);
  return () => worker.terminate();
});
```

The rest of the page reads the machine through `useSelector` from `@xstate/react`, and sends it events from handlers. Short-lived UI state, such as a panel being open, stays in `useState` where it is used.

---

## 3. Options considered

**Stay plain HTML.** Rejected in the review of ADR-0001. Zoom and pan, the panels, the Advanced panel built from `codecs()` and a borrowed component library are a component tree, and building one by hand in one module costs more than a build step does.

**Preact.** Its runtime is a few kilobytes against React's 69 KB gzip. The 65 KB saved is about 2.5 % of what the page already loads for the wasm, and the headless component libraries ADR-0003 will look at target React, through `preact/compat` at best. Rejected: the saving does not pay for the friction.

**Svelte or Solid.** Smaller output and fine frameworks, but not the maintainer's stack, and the page is maintained by one person. Rejected.

**Astro, or prerendering the empty state.** One page with no content to render ahead of time, except the empty state of ADR-0001 D1, which a static HTML shell could paint before the script runs. Left open: it is a build option on top of D1, not a different framework.

**Keep `sqzer` on jsDelivr at run time.** It keeps brotli and the `immutable` header, but it also keeps a third-party origin in the policy. It puts a URL import that the bundler and `tsc` cannot follow into the worker, and it needs the version pushed into the build through `define`. Rejected for D2.

**Move hosting to a host with brotli and real headers**, such as Cloudflare Pages or Netlify. That would win back the 8 %, put the policy in a header, and allow the cross-origin isolation threads would need. Deferred: hosting stays GitHub Pages until threads are on the table, which ADR-0011 rules out for now.

**Keep a public browser check** as a second Vite entry, so anyone can open it in Safari and paste its lines into an issue, as `/selftest/` allows today. Rejected: it is a second page to build and keep in step with the suite for one browser. Safari is checked by hand.

**The Babel React Compiler.** The stable path, and the fallback of D1. Not the default because the review asked for the new tooling, and the prototype showed both producing the same bundle.

**ESLint.** The stable linter and the home of `eslint-plugin-react-hooks`. Not the default for the same reason. It stays the fallback for the React Compiler rules if oxlint's JS plugins fail them.

**Vitest in jsdom with React Testing Library.** The usual setup. Rejected: jsdom has no canvas and no worker, so the `decodeAny` checks could not move into it, and browser mode tests the components in the engines the page runs in.

**A typed `useReducer` for the search.** No dependency. Rejected: the worker's lifetime would sit in an effect next to the reducer, and keeping the two in step is exactly what an invoked actor does on its own.

**`@xstate/store`.** Smaller, but it is a store of events, without states or invoked actors, so the worker's lifetime would again be held by hand. Rejected.

**React's `unstable_` and canary APIs.** Out: the standards keep production code to stable APIs and Baseline features. D9 uses only what 19.3 exports as stable.

---

## 4. Trade-offs

**A build step against none.** Every change now goes through `pnpm install`, a build and a lockfile, and a broken build stops a deploy. The checks of D6 run on every pull request, so it stops there and not on the site.

**69 KB of React and a bigger first download.** React and the 8 % from D2 together come to about 270 KB on a page that already moves 2.4 MB before the first image. Against that, the page talks to one origin.

**New tools against settled ones.** The Rust compiler is experimental, its version lags the plugin's peer range, and oxlint's JS plugins are alpha. Each has its stable counterpart named as a fallback in D1 and D6, and each switch back is a change to configuration, not to the code.

**XState against plain React state.** 14 kB gzip and a second way of holding state. The machine holds only the search, where the worker's lifetime makes it worth it, and nothing else moves into it.

**The development server differs from the site.** It runs without the policy and with inline Fast Refresh scripts. A change that breaks the policy shows up in the Playwright suite against `vite preview`, not while developing.

**More tools to keep current.** TypeScript, oxlint, Steiger, Vitest, Playwright and XState each have releases. Dependabot groups them, and none of them ships to the reader.

---

## 5. Consequences

What becomes easier: ADR-0001 can be built as components, with types from the package and a component library. Cancelling a search can no longer leak a worker, because the machine of D10 ends it. The policy loses its one exception. The tests run where the code runs, in two engines, and say so in CI.

What becomes harder: the page is no longer something to open from a folder. Reading it means `pnpm install` and `pnpm dev`, and a contributor needs Node and pnpm.

What changes elsewhere:

- ADR-0011 D6 of `sqzer` says the page is plain HTML with no framework and no bundler, and that it imports the package from jsDelivr. This record replaces both for the page. It does not change what D6 decided about the repository, the licence or the release procedure. ADR-0011 is accepted, so `sqzer` notes this under its action item 5, which its rules allow, rather than editing the decision.
- This repository's `CLAUDE.md`, `README.md`, `CONTRIBUTING.md` and the PR template describe `site/`, jsDelivr and "no build step". They change with the port, not before it, so they keep describing the code that is on `main`.
- The Greptile rules change in this pull request, so the port is reviewed against them. `no-third-party` drops jsDelivr. `package-by-version` describes the exact version in `package.json` and the lockfile. `work-in-the-worker`, `codecs-drive-the-controls` and `no-codecs-here` move to the paths of D4 and D5. `browser-check` describes the suite of D6.

---

## 6. Action items

1. [ ] The port: `site/` becomes the Vite project of D7, `main.js` and `worker.js` become TypeScript under D4 and D5 with the search as the machine of D10, and the page behaves exactly as it does today. The redesign of ADR-0001, with D9, starts after it.
2. [ ] The checks of D6 in `check.yml`, in the `browser` job, with `/selftest/` moved into Vitest browser mode and `.github/check.mjs` into the Playwright suite. Their first green run in CI is the browser check this record could not make.
3. [ ] `pages.yml` builds and uploads `dist/`.
4. [ ] `dependabot.yml`: the `npm` ecosystem at the root, `sqzer` alone, the tooling grouped.
5. [ ] `CLAUDE.md`, `README.md`, `CONTRIBUTING.md` and the PR template, with the port. The README's "Checking a browser" section goes.
6. [ ] `sqzer-dev/sqzer`: a note under ADR-0011 action item 5 pointing here.
7. [ ] ADR-0003: the design system, the component library and the styling system.

---

## Open

- Prerendering the empty state, so ADR-0001 D1 paints before the script runs.

---

## Sources

- ADR-0001 of this repository, D10 and its review: [`0001-page-design.md`](0001-page-design.md)
- ADR-0011 D6, `sqzer-dev/sqzer`: https://github.com/sqzer-dev/sqzer/blob/main/docs/adr/0011-browser-build.md
- `@vitejs/plugin-react`, React Compiler: https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react
- React Compiler: https://react.dev/learn/react-compiler
- `<ViewTransition>`: https://react.dev/reference/react/ViewTransition, `<Activity>`: https://react.dev/reference/react/Activity
- View transitions in Baseline: https://web-platform-dx.github.io/web-features-explorer/features/view-transitions/
- oxlint JS plugins: https://oxc.rs/docs/guide/usage/linter/js-plugins.html
- Vitest browser mode: https://vitest.dev/guide/browser/, `vitest-browser-react`: https://github.com/vitest-dev/vitest-browser-react
- XState: https://stately.ai/docs/xstate, callback actors: https://stately.ai/docs/callback-actors
- Vite, workers and `new URL(..., import.meta.url)`: https://vite.dev/guide/features#web-workers, https://vite.dev/guide/assets#new-url-url-import-meta-url
- Vite, `build.assetsInlineLimit`: https://vite.dev/config/build-options#build-assetsinlinelimit
- Feature-Sliced Design: https://feature-sliced.design, Steiger: https://github.com/feature-sliced/steiger
- GitHub Pages, the `wabt` demo used for the compression check: https://webassembly.github.io/wabt/demo/
- `sqzer` on npm: https://www.npmjs.com/package/sqzer
- pnpm: https://pnpm.io, `pnpm/action-setup`: https://github.com/pnpm/action-setup
- Dependabot's supported pnpm versions: https://github.com/dependabot/dependabot-core/blob/main/npm_and_yarn/lib/dependabot/npm_and_yarn/pnpm_package_manager.rb
