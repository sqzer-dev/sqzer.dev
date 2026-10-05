# Contributing to sqzer.dev

Bug reports, fixes and small improvements to the page are welcome. The page is maintained by one person, so a small, focused change gets reviewed much faster than a large one.

## Language

English is preferred for issues and pull requests; if you can, add an English version next to the original. Machine translation is fine, and so is imperfect English. Commit messages and code comments are in English.

## Before you start

- Anything bigger than a small fix: open an issue first, so we agree on the approach before you spend time on it.
- Decisions live in [`docs/adr`](docs/adr), on top of D6 of [ADR-0011 in `sqzer-dev/sqzer`](https://github.com/sqzer-dev/sqzer/blob/main/docs/adr/0011-browser-build.md). A change to a decision gets a new numbered record; an accepted one is never edited.
- What the page cannot do because the package cannot: a format, an option, a decoder. That is a change to [`sqzer-dev/sqzer`](https://github.com/sqzer-dev/sqzer) first, then a version bump here.
- Usage questions go to the [Discussions of `sqzer`](https://github.com/sqzer-dev/sqzer/discussions/categories/q-a), not issues.
- Security problems go through [private vulnerability reporting](https://github.com/sqzer-dev/sqzer.dev/security/advisories/new), never a public issue. See [`SECURITY.md`](SECURITY.md).

## Development setup

The page needs Node 24 and pnpm, which `packageManager` in `package.json` pins.

```sh
pnpm install

# the page at http://localhost:5173, reloading as you edit. it runs without the Content-Security-Policy
pnpm dev

# the page as it is deployed, at http://localhost:4173
pnpm build && pnpm preview
```

## Checks

CI runs the `browser` job on every pull request, against the version of `sqzer` your branch names. Run the same before asking for review.

```sh
# the two test suites need the browsers once
pnpm exec playwright install --with-deps chromium firefox

# types, oxlint, oxfmt, Steiger, Vitest in browser mode, then Playwright against the built page
pnpm check

# rewrites what `pnpm format:check` complains about
pnpm format
```

A change to a path that depends on the browser, the canvas fallback, `decodeAny` or the comparison, gets a Vitest test next to it, as `*.test.ts` or `*.test.tsx`. The checks are strict on purpose: a lint rule is turned off only in `.oxlintrc.json`, with its reason next to it.

> **Note**: The suites run in Chromium and Firefox. Safari cannot be driven here. If your change touches the canvas fallback or the comparison, say in the PR which browsers you tried.

## Rules the page follows

- React 19 and TypeScript, built by Vite into static files. The code sits in `src/pages/compress/` until a second place uses a part of it, and imports go to lower layers through a public `index.ts`.
- `sqzer` is a dependency at an exact version, installed from the committed `pnpm-lock.yaml` and served from the page's own origin. `package.json` and the lockfile are the only places the version is written.
- The page sends nothing anywhere: its own origin is the only host. The `Content-Security-Policy` in `vite.config.ts` enforces it and is not widened for convenience. No inline script, no `style` attribute, no `<style>` block.
- Every call into the package runs in the worker. A search cannot be interrupted, so cancelling means ending the worker and starting another, and only the search machine does that. An idle worker is kept: it holds the decoded image.
- The package's decoder comes first; the browser's canvas decodes only what the package cannot. Nothing here decodes, encodes, resizes or scores an image itself.
- Formats, backends and what the page says it reads come from the package's `codecs()`, never from a list in the code.

## Licences and new dependencies

The page is `MIT OR Apache-2.0`. A pull request that adds a dependency says why the page cannot do without it and states the licence. AGPL and GPL code is not accepted until the page switches to the AGPL build of `sqzer`, which will be its own decision.

Unless you say otherwise, any contribution you submit is dual-licensed as `MIT OR Apache-2.0`, as defined in the Apache-2.0 licence, without additional terms.

## Pull requests

- Branch from `main`, open a PR, and it is squash-merged. Intermediate commits on the branch do not matter. Every merge to `main` deploys.
- The PR title becomes the commit message, so it uses a conventional prefix: `feat: ...`, `fix: ...`, `ci: ...`, `docs: ...`.
- The browser check has to be green and every review thread resolved before the merge.
- Copy on the page, docs, issue forms and error text follow the house style: sentence case headings, backticks on every identifier and path, no em dashes, no emoji, no tables, uncertainty stated flatly with the next step named.

## Code of conduct

Everyone taking part is expected to follow the [code of conduct](CODE_OF_CONDUCT.md). Reports go to `conduct@sqzer.dev`.
