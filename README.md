# sqzer.dev

The page at [sqzer.dev](https://sqzer.dev): drop an image, get a smaller one that looks the same. It runs [`sqzer`](https://github.com/sqzer-dev/sqzer) in the browser, from the [`sqzer` package on npm](https://www.npmjs.com/package/sqzer). The image never leaves the tab: no upload, no analytics, no error reporting, and no request to any origin but the page's own.

React 19 and TypeScript, built by Vite into static files.

```
index.html              the entry Vite builds
src/app/                the root and the global stylesheet
src/pages/compress/     the page: its parts, the search machine, the helpers
src/shared/api/sqzer/   the worker: every call into `sqzer`, off the main thread
tests/                  the end-to-end suite and the fixtures
docs/adr/               the decisions
```

## Run it

It needs Node 24 and pnpm, which `packageManager` in `package.json` pins.

```sh
pnpm install

# the page at http://localhost:5173, reloading as you edit. it runs without the Content-Security-Policy
pnpm dev

# the page as it is deployed, at http://localhost:4173
pnpm build && pnpm preview
```

## The version of `sqzer`

`sqzer` is a dependency at an exact version. Vite bundles it into the worker and serves its wasm from the page's own origin, and the footer shows the version the worker loaded.

```
# package.json. after a release of sqzer: merge the Dependabot pull request, or edit the version and run `pnpm install`
"dependencies": { "sqzer": "0.3.0" }
```

> **Note**: Keep it an exact version. `package.json` and `pnpm-lock.yaml` are the only places it is written.

## Checks and deploy

Every pull request runs `.github/workflows/check.yml` first, against the version of `sqzer` the branch names. A Dependabot bump that breaks the page fails there instead of on the site.

```sh
# all of it, as CI runs it
pnpm check

# or one at a time
pnpm typecheck      # tsc
pnpm lint           # oxlint
pnpm format:check   # oxfmt. `pnpm format` rewrites
pnpm fsd            # Steiger, the Feature-Sliced Design layers
pnpm test           # Vitest in browser mode, in Chromium and Firefox
pnpm test:e2e       # Playwright against the built page, in Chromium and Firefox

# the two test suites need the browsers once
pnpm exec playwright install --with-deps chromium firefox
```

Every merge to `main` is a deploy: `.github/workflows/pages.yml` builds the page and publishes `dist/` to GitHub Pages.

## Contributing

Issues and pull requests are welcome; [`CONTRIBUTING.md`](CONTRIBUTING.md) has the rules the page follows and how a change is checked. A bug in the output itself belongs to [`sqzer`](https://github.com/sqzer-dev/sqzer), the package the page runs. Security reports go through [private vulnerability reporting](https://github.com/sqzer-dev/sqzer.dev/security/advisories/new), see [`SECURITY.md`](SECURITY.md).

## Licence

MIT or Apache-2.0, at your option.
