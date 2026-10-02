<!-- English preferred. The title becomes the squash commit: `feat: ...`, `fix: ...`, `ci: ...`, `docs: ...`. Every merge to `main` deploys. -->

## What and why

<!-- What changes, and the issue it comes from. -->

## Browsers tried

<!-- CI covers headless Chromium. Which browsers did you load the page in? For a change to the canvas fallback or the comparison, Safari matters. -->

## New dependencies

<!-- The page has one, `sqzer`. Anything else: what, why the page cannot do without it, and its licence. Or "none". -->

## Checklist

- [ ] `.github/check.mjs` passes locally, or CI shows it green
- [ ] a path that depends on the browser got a line in `/selftest/`, if one changed
- [ ] a new ADR has its row in `docs/adr/README.md` and its entry in `.greptile/files.json`, if there is one
- [ ] the `Content-Security-Policy` is unchanged, or the PR says why it had to change
