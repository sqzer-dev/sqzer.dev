# Contributing to sqzer.dev

Bug reports, fixes and small improvements to the page are welcome. The page is maintained by one person, so a small, focused change gets reviewed much faster than a large one.

## Language

English is preferred for issues and pull requests; if you can, add an English version next to the original. Machine translation is fine, and so is imperfect English. Commit messages and code comments are in English.

## Before you start

- Anything bigger than a small fix: open an issue first, so we agree on the approach before you spend time on it.
- Decisions live in [`docs/adr`](docs/adr). The ones the page is built on are in [`sqzer-dev/sqzer`](https://github.com/sqzer-dev/sqzer/blob/main/docs/adr/0011-browser-build.md), D6. A change to a decision gets a new numbered record; an accepted one is never edited.
- What the page cannot do because the package cannot: a format, an option, a decoder. That is a change to [`sqzer-dev/sqzer`](https://github.com/sqzer-dev/sqzer) first, then a version bump here.
- Usage questions go to the [Discussions of `sqzer`](https://github.com/sqzer-dev/sqzer/discussions/categories/q-a), not issues.
- Security problems go through [private vulnerability reporting](https://github.com/sqzer-dev/sqzer.dev/security/advisories/new), never a public issue. See [`SECURITY.md`](SECURITY.md).

## Development setup

Nothing to install for the page itself: any static file server over `site/` works, and the package comes from jsDelivr.

```sh
# then open http://localhost:8000, and http://localhost:8000/selftest/ for the browser checks
python3 -m http.server -d site 8000
```

## Checks

CI runs `.github/check.mjs` on every pull request: `/selftest/` and one JPEG through the page in headless Chromium, against the version of `sqzer` your branch names. Run it before asking for review, then load the page in Chrome and Firefox yourself: a JPEG, an SVG, a TIFF, a file that is no image, and a change of format while a search runs.

```sh
# the same check, locally. needs the network: the package comes from jsDelivr
npm install --no-save --no-package-lock playwright@1.63.0
npx playwright install --with-deps chromium
python3 -m http.server -d site 8000 &
node .github/check.mjs
```

> **Note**: Safari cannot be driven here. If your change touches the canvas fallback or the comparison, say in the PR which browsers you tried.

## Rules the page follows

- Plain HTML, one ES module and one worker script. No framework, no bundler, no build step, no dependency other than `sqzer`.
- `sqzer` comes from jsDelivr at the exact version in `site/package.json`. That file is the only place the version is written.
- The page sends nothing anywhere: its origin and jsDelivr are the only hosts. The `Content-Security-Policy` in `site/index.html` enforces it and is not widened for convenience.
- Every call into the package runs in the worker. A search cannot be interrupted, so cancelling means ending the worker and starting another.
- The package's decoder comes first; the browser's canvas decodes only what the package cannot. Nothing here decodes, encodes, resizes or scores an image itself.
- Formats, backends and what the page says it reads come from the package's `codecs()`, never from a list in the code.

## Licences and new dependencies

The page is `MIT OR Apache-2.0`, and it has one dependency, `sqzer`, under the same licence. A pull request that adds another one says why the page cannot do without it and states the licence. AGPL and GPL code is not accepted until the page switches to the AGPL build of `sqzer`, which will be its own decision.

Unless you say otherwise, any contribution you submit is dual-licensed as `MIT OR Apache-2.0`, as defined in the Apache-2.0 licence, without additional terms.

## Pull requests

- Branch from `main`, open a PR, and it is squash-merged. Intermediate commits on the branch do not matter. Every merge to `main` deploys.
- The PR title becomes the commit message, so it uses a conventional prefix: `feat: ...`, `fix: ...`, `ci: ...`, `docs: ...`.
- The browser check has to be green and every review thread resolved before the merge.
- Copy on the page, docs, issue forms and error text follow the house style: sentence case headings, backticks on every identifier and path, no em dashes, no emoji, no tables, uncertainty stated flatly with the next step named.

## Code of conduct

Everyone taking part is expected to follow the [code of conduct](CODE_OF_CONDUCT.md). Reports go to `conduct@sqzer.dev`.
