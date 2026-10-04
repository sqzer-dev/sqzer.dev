# ADR-0004: The worker outlives a search

**Status:** Proposed   **Date:** 2026-10-04   **Deciders:** Vlad (sole maintainer)
**Scope:** How long the worker lives and how a search is cancelled, which ADR-0002 D10 decided, and where the page's code sits, which ADR-0002 D5 sketched. Nothing else in ADR-0002 changes, and nothing in ADR-0001 or ADR-0003.

---

## 1. Context

ADR-0002 D10 made the worker a callback actor invoked by `searching`. Leaving that state for any reason ends the worker, a finished search included. The page on `main` does it differently: one worker lives as long as the tab, and it is ended only to cancel.

The port was built the way D10 says first, and both pages were measured in headless Chromium and Firefox:

```text
# a 4000x2250 JPEG, format `jpeg`, fixed quality, width 1600. the time from a change of
# quality to the result on the page, the 250 ms the controls rest included
                              Chromium   Firefox
the page on `main`            0.37 s     0.57 s
a worker per search, D10      0.95 s     1.15 s
```

The package keeps the decoded and the resized image between calls, "so a quality slider only pays for the encode", as its README says. A worker per search throws that away: every change of a control starts a worker, instantiates 8 MB of wasm, decodes and resizes again. ADR-0001 puts a target control and an Advanced panel on the page, and each of them would pay this.

The port also ran Steiger for the first time. The page has one route, so six of the slices D5 names are used in one place each, and `fsd/insignificant-slice` flags all six.

---

## 2. Decision

### D1. The worker lives as long as the machine's `open` state

The machine gets one state above the four of D10. `open` invokes the worker actor, and `empty`, `searching`, `result` and `failed` are its children. The worker starts with the page, so `codecs()` and the version reach the controls before any image, and it keeps the decoded image between searches. A search that ends in `result` or in `failed` leaves the worker running.

```text
open                    invokes the worker actor
  empty                 no image yet
  searching
    reading             the worker decodes the image, or the page draws it
    encoding            the search, or one encode at a fixed quality
  result
  failed
```

With this, a change of quality on the photo above takes 0.37 s in Chromium and 0.55 s in Firefox, the same as on `main`.

### D2. Cancelling is re-entering `open`

A `restart` event re-enters `open`. That stops the actor, and the actor's cleanup terminates the worker. It is still the only way an encode is cancelled, and still held by the machine: no code outside it ends a worker.

```text
a new image during a search          at once. the worker is busy with the image that left
the controls move during a search    after 300 ms. if the worker finishes what it was doing
                                     first, it stays and encodes again with the newest options
a failure while newer options wait   at once, so the newest options get their run
a search asked of a worker that      at once
failed to start or to load
```

The 300 ms are the `PATIENCE_MS` of `site/main.js`. A worker that is idle is never ended: a new image or new options go to the one that is there.

### D3. Every message names its image

A worker that outlives its image can still answer for it. Each request carries a number for the image it is about, the worker repeats it in the reply, and the actor drops a reply about an image that was replaced since. `site/worker.js` did the same with `id`. Its `job` is gone: the machine has one encode running at a time and marks it `outdated` when the controls move.

### D4. Slices are merged until something is reused

`fsd/insignificant-slice` stays on. A slice exists once two places use it, and until then its code sits with its one user. For a page with one route that is the page:

```text
src/app/                    the root and the global stylesheet
src/pages/compress/ui/      the page and its parts: drop zone, controls, status, comparison, result
src/pages/compress/model/   the search machine, the worker actor, the picked image, the result
src/pages/compress/lib/     drawing on the page, codec lookups, the summary, reading the controls
src/shared/api/sqzer/       the worker, its client and the message types (ADR-0002 D4),
                            behind `src/shared/api/index.ts`
src/shared/lib/             small helpers, named by their domain
```

The search machine is in `src/pages/compress/model/`, not in `src/features/encode-image/model/`. When a second place needs a part, it moves down to the layer D5 names for it. `src/shared/ui/` arrives with ADR-0003.

---

## 3. Options considered

**A worker per search, as D10 had it.** The smallest machine: four flat states and an actor that runs one script. Rejected for the numbers in section 1.

**Cancelling inside the package**, so that a worker never has to be ended. Not possible in a form the page can use today:

- The search calls `Encoder::encode` once per trial, and that is one blocking call into a third-party encoder with no way to stop it. The earliest a search could stop is between two trials. ADR-0011 measured 18 seconds for a search on a 12 megapixel photo. A search is at most six trials, so that is about three seconds each.
- While a trial runs, the worker's event loop is blocked, so a `cancel` message is not delivered until the whole search is over. Reaching a blocked worker takes a `SharedArrayBuffer`, which needs the isolation headers GitHub Pages cannot send. The other way is a search that yields between trials, which needs JSPI, experimental in `wasm-bindgen`, or the search loop of `sqzer-metrics` rebuilt as steps. ADR-0011 names both limits.
- Ending the worker stops an encode at once.

It comes back if the hosting can send the headers or an encoder gains a hook. It would be a change to `sqzer` first and a version bump here after.

**A spawned actor**, stopped and spawned again by actions, with the four states flat. Rejected: the worker's lifetime would be held by two actions that have to stay in step. With `open` it is held by a state.

**Turning `fsd/insignificant-slice` off** and keeping the slices of D5. Rejected: a slice with one user is a folder to walk through, and merging costs nothing to undo when the second user comes.

---

## 4. Trade-offs

**A bigger machine.** `open`, the patience, the image numbers, and three flags, `held`, `outdated` and `broken`, where D10 had four states and no flag. All of it is what `main.js` already held in variables.

**The decoded image stays in memory** for as long as the tab shows it, as on `main`. A worker per search gave it back after every result.

**One slice holds the page.** Steiger checks the layers, not the folders inside a slice, so `ui`, `model` and `lib` under `pages/compress` are kept apart by review until parts of them move out.

---

## 5. Consequences

- ADR-0002 gets a `Superseded by` line for the worker's lifetime in D10 and for the slice list of D5. The rest of D10 stands: an XState machine, the worker as a callback actor, the client used by nothing else.
- The Greptile rule `work-in-the-worker` names `src/pages/compress/model/` and the `open` state. This record gets its entry in `.greptile/files.json`.
- The rule in `CLAUDE.md` holds as it is written: a search cannot be interrupted, and ending the worker is the only way an encode is cancelled.

---

## 6. Action items

1. [x] The machine of D1 to D3 and the layout of D4, in the port of ADR-0002 item 1.
2. [x] Steiger in `check.yml` with `fsd/insignificant-slice` on, with ADR-0002 item 2.

---

## Sources

- ADR-0002 D4, D5 and D10, in this directory
- `site/main.js` and `site/worker.js` on `main`, for `PATIENCE_MS`, `id` and `job`
- The package's README, "Decode once, encode many times": https://github.com/sqzer-dev/sqzer/tree/main/crates/sqzer-wasm
- ADR-0011 of `sqzer-dev/sqzer`, for the single thread, the isolation headers and JSPI: https://github.com/sqzer-dev/sqzer/blob/main/docs/adr/0011-browser-build.md
- `Search::encode_with` in `crates/sqzer-metrics/src/search.rs` and `Encoder::encode` in `crates/sqzer-core/src/codec.rs`, `sqzer-dev/sqzer`
- XState, re-entering a state: https://stately.ai/docs/transitions#re-entering
- Steiger, `insignificant-slice`: https://github.com/feature-sliced/steiger/tree/master/packages/steiger-plugin-fsd/src/insignificant-slice
