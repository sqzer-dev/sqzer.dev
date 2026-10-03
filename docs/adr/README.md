# Architecture decision records

One file per decision, numbered, never edited after acceptance. A superseded record gets a `Superseded by` line at the top and stays.

```
0001-page-design.md   the design of the page, from references   Accepted
0002-stack.md         the stack: React 19, Vite, XState, `sqzer` from npm   Proposed
```

The decisions this page is built on were taken in [`sqzer-dev/sqzer`](https://github.com/sqzer-dev/sqzer) and stay there: [`docs/adr/0011-browser-build.md`](https://github.com/sqzer-dev/sqzer/blob/main/docs/adr/0011-browser-build.md), D3 for the package's API and D6 for this page: its own repository, the published package by version from jsDelivr, a static page without a framework or a build step, nothing sent anywhere, the licence line it sits on.

What belongs here: the look of the page, its controls and behaviour, its hosting, and the switch to the AGPL build when that exists. A design record was drafted and parked in [pull request 1](https://github.com/sqzer-dev/sqzer.dev/pull/1); the real one starts from the notes at its top.

Template for a new record: `**Status**`, `**Date**`, `**Deciders**`, `**Scope**`, then Context, Decision (D1, D2, ...), Options considered, Trade-offs, Consequences, Action items. Sentence case, short prose, a fenced block for the detail.
