# sqzer.dev

The page at [sqzer.dev](https://sqzer.dev): drop an image, get a smaller one that looks the same. It runs [`sqzer`](https://github.com/sqzer-dev/sqzer) in the browser, from the [`sqzer` package on npm](https://www.npmjs.com/package/sqzer). The image never leaves the tab: no upload, no analytics, no error reporting.

Plain HTML, one ES module and one worker script. No framework, no bundler, no build step.

```
site/index.html     the page
site/main.js        the file, the controls, what is shown
site/worker.js      every call into `sqzer`, off the main thread
site/package.json   the version of `sqzer` the page imports
site/selftest/      what `decodeAny` does in the browser that opens it
```

## Run it

Any static file server over `site/` works. The package itself comes from jsDelivr, so this needs a network.

```sh
# then open http://localhost:8000
python3 -m http.server -d site 8000
```

## The version of `sqzer`

`site/package.json` is the one place it is written. `worker.js` reads it and imports `https://cdn.jsdelivr.net/npm/sqzer@<version>/sqzer.js`. Nothing is installed from it.

```
# site/package.json. after a release of sqzer: edit the version, or merge the Dependabot pull request that does
"dependencies": { "sqzer": "0.3.0" }
```

> **Note**: Keep it an exact version. `worker.js` puts the string into the URL as it is.

## Deploy

Every merge to `main` is a deploy: `.github/workflows/pages.yml` publishes `site/` to GitHub Pages as it is.

Every pull request runs `.github/workflows/check.yml` first: the page and `/selftest/` in headless Chromium, against the version of `sqzer` the branch names. A Dependabot bump that breaks the page fails there instead of on the site.

```sh
# the same check, locally. needs the network: the package comes from jsDelivr
npm install --no-save --no-package-lock playwright@1.63.0
npx playwright install --with-deps chromium
python3 -m http.server -d site 8000 &
node .github/check.mjs
```

## Checking a browser

`sqzer`'s own tests run in Node, which has no canvas. What `decodeAny` does with an SVG or a HEIC file depends on the browser, so that part is checked by opening a page in it:

```
https://sqzer.dev/selftest/
```

It prints one line per check. `ok` is as documented, `note` differs between browsers and may, `FAIL` is a defect: open an issue with the text.

## Contributing

Issues and pull requests are welcome; [`CONTRIBUTING.md`](CONTRIBUTING.md) has the rules the page follows and how a change is checked. A bug in the output itself belongs to [`sqzer`](https://github.com/sqzer-dev/sqzer), the package the page runs. Security reports go through [private vulnerability reporting](https://github.com/sqzer-dev/sqzer.dev/security/advisories/new), see [`SECURITY.md`](SECURITY.md).

## Licence

MIT or Apache-2.0, at your option.
