# ADR-0005: What the page says in passing is a toast

**Status:** Accepted   **Date:** 2026-10-07   **Deciders:** Vlad (sole maintainer)
**Scope:** Where the page says what it is doing: the encoder loading, the image being read, the trials as they land, the result's time. ADR-0001 D4 put that in the status panel, on a status line; this record moves it to toasts, and says how a toast is announced, what stays of the trial list, and where the toaster sits. Failures stay where ADR-0001 D6 puts them. Nothing else in ADR-0001 changes, and nothing in ADR-0002 to ADR-0004.

---

## 1. Context

ADR-0001 D4 decided that the status panel shows each trial as it lands, as `trial 3 of at most 6: q 62, score 71.4`, that the first 500 ms of a search show nothing, and that the status line stays `role="status"`. The page on `main` has it as one `<output>` line, in the result panel and in the empty state, saying `Loading the encoder.`, `Ready.`, `Reading x.`, `Encoding: trial ...` and `Done in 1.2 s.` in turn, and a failure in the alert's colours.

The maintainer's review of pull request 12, issue 13, moved it: "Loading the encoder." and "Ready." go to a toast, and the encoding notifications with them. The reference is Squoosh, whose snackbar says what happened in passing and goes away. The reasons, as seen on the page:

```text
the line sits in the result panel, which reads as a result, and says "Loading" or "Ready" with none
on a phone the panel is in the bottom expander, so the line is out of sight at rest, while a search runs
the line reserves its height in both states, for text that is absent most of the time
```

The maintainer's reference for how a toaster feels is sonner: the stack that peeks behind the newest toast and expands on hover, the slide in, the swipe away. Settled in the issue: sonner injects its CSS through a `<style>` element at run time, which `style-src 'self'` blocks, and allowing it means `'unsafe-inline'` or a hash for style elements in a policy the page quotes to its readers (ADR-0001 D7). The policy stays as it is.

Base UI's `Toast`, which shadcn's `toast` is built on, makes no `<style>` element, as ADR-0003 D2 found of the library as a whole. Read from its source at 1.8.0:

```text
viewport    a `region` named "Notifications", `aria-live="polite"`, `aria-relevant="additions text"`:
            an added toast and a change of its text are announced, a removal is not
toast       a `dialog` named by its title, focusable. F6 moves the focus to the viewport
priority    `low` by default. `high` makes the toast an `alertdialog` and mirrors it into a hidden
            `role="alert"` element, which is announced at once
same id     `add` with the id of a toast on the screen updates it in place and restarts its timer
stack       `--toast-index`, `--toast-offset-y`, `--toast-frontmost-height`, `data-expanded` while hovered
            or focused, `--toast-swipe-movement-x` and `-y` while swiped, `data-limited` past the limit
            of 3. shadcn's component draws the stack from these, anchored to the bottom
timeout     5 s by default. 0 keeps a toast until it is closed. hover and focus pause the timers
```

The viewport is what `role="status"` means, a polite live region, without the role.

---

## 2. Decision

### D1. What the page says in passing is a toast

The loading of the encoder, the reading of the image, the trials as they land and the result's time are toasts. The toaster is shadcn's `toast` on Base UI's `Toast`, in `src/shared/ui/`, hand-edited to the tokens like the other components (ADR-0003 D1), and made to feel like sonner from Base UI's own variables: the stack that peeks behind the newest toast and expands on hover, the slide in, the swipe away. No `<style>` element, and no change to the policy.

The status line of ADR-0001 D4 goes, in both states.

### D2. Two toasts, each updated in place

Each concern is one toast with a fixed id, updated in place rather than added again, so the screen never holds two toasts about the same thing:

```text
encoder   Loading the encoder.                                 loading, kept until it changes
          Ready.                                               success, the default timeout, or gone as
                                                               soon as an image is on the page
search    Reading <file>.                                      loading, kept until it changes
          Encoding <file>.                                     loading, kept until it changes
            Trial 3 of at most 6: quality 62 scores 71.4.        the newest trial, as the description
          Done in 1.2 s.                                       success, the default timeout
```

The 500 ms of ADR-0001 D4 hold: the search toast appears once a search has run for 500 ms, and says `Done` for that search alone. A search over sooner shows no toast at all: the result panel is its message, and a toast would be the flash D4 rules out. A toast still on the screen from the search before waits the same 500 ms before it changes, so a run of quick changes to the controls does not flip it between encoding and done. A toast the reader closed during a search stays closed until the search is done.

A failure closes the search toast and is shown where ADR-0001 D6 puts it: as an alert in the panel, and in the empty state until an image is on the page. Nothing in D6 changes.

### D3. How a toast is announced

Every toast is low priority. Base UI's viewport is the one polite live region on the page, and the `role="status"` line of ADR-0001 D4 is not needed beside it. An added toast is announced, and so is a change of its text, so a trial is read as it lands, as D4 asked, and the drawing of the stack is not. High priority is used for nothing here: a failure is D6's alert.

A toast is a `dialog` named by its title, its close button has a name, and F6 moves the focus to the viewport. A toast is closed by its button, by Escape with the focus on it, by a swipe, or by its timeout, which hover and focus pause.

### D4. What stays of the trial list

The machine keeps every trial of the running search, as before. The toast shows the newest. The list of all of them and the chart of ADR-0001 D4 stay in the result panel, built with ADR-0001 item 8 from the same context. The cancel button that D4 put beside the status line becomes the action of the search toast, with the same item: the machine has no cancel that leaves the search where it was, only `restart`.

### D5. Where the toaster sits and what it looks like

The viewport is at the top right of the screen, under the corner labels of ADR-0001 D2, and the stack grows downward, newest on top. On a phone it spans the width between the screen's edges. The top is the one edge nothing else claims: the bottom holds the view bar and the panels on a wide screen and the expander on a phone, and the corners hold the labels.

A toast is the popover's surface: opaque, `popover` on its tokens, a `border` edge, no shadow. It is not glass. Glass is for what stays over the image, and a toast is transient, as the popover and the tooltip are. It is also the one surface that sits over the empty state, where there is no image to see through. Its title is in Geist Sans and the trial line in Geist Mono, as ADR-0003 D3 has it for numbers the reader compares.

---

## 3. Options considered

**sonner.** The reference for the feel, and the maintainer finds it beautiful. Rejected, in the issue: it injects its CSS through a `<style>` element at run time, which the policy blocks, and the policy stays. Base UI's parts give the same behaviour from CSS variables, and shadcn's component already draws it.

**The status line as it was.** Rejected in the review: it reads as a result, it is out of sight on a phone while a search runs, and it reserves its height for text that is absent most of the time.

**A failure as an error toast.** The same mechanism, with high priority for the announcement. Rejected: D6 puts the alert next to the controls that fix it, with a sentence per error kind, and the review asked for no change there. One place for a failure.

**The trial list in the toast.** Rejected: a toast says the latest thing. The list belongs with the chart, in the panel, where it can be read after the search.

**A toast per trial.** Rejected: a search is at most six trials, and six toasts for one search is noise. The same id updates in place.

**The toaster at the bottom.** Where Squoosh and sonner put theirs. Rejected: the bottom of this page holds the view bar, the panels and, on a phone, the expander at rest.

**Glass on the toast.** It floats over the image. Rejected: it is transient, it sits over the empty state too, and a surface that comes and goes over an image costs a repaint of the blur each time for nothing. Opaque, like the popover.

---

## 4. Trade-offs

**A toast covers the image for a moment.** At the top right, under the label, for 5 s after a result. The reader can close it, and the stack holds 3 at most.

**One live region.** Everything the page says in passing goes through the viewport. A message that has to be assertive would need high priority, and the one such message, a failure, is not a toast.

**A stale `Done`.** A search over within 500 ms leaves the `Done` of the search before on the screen until its timeout, with that search's time on it. It is true of the search it names, and the result panel shows the new result beside it.

---

## 5. Consequences

- ADR-0001 gets a `Superseded by` line for the status panel and the status line of D4. The rest of D4 stands: the 500 ms, the trial's form, the chart, and the cancel, which moves into the toast (D4 here).
- The Playwright suite and the component tests read the toasts for where a search is, where they read the status line.
- The toaster is `src/shared/ui/toast.tsx`, and the page's two toasts are derived from the machine's snapshot in `src/pages/compress/model/notices.ts`.
- This record gets its entry in `.greptile/files.json`. The rules of `.greptile/config.json` do not change: the toast is not glass, and the policy is as it was.

---

## 6. Action items

1. [x] The toaster of D1 and D5, and the two toasts of D2, with issue 13.
2. [ ] The cancel action and the trial list of D4, with ADR-0001 item 8.

---

## Open

- Whether `Done in 1.2 s.` still earns a toast once the result panel of ADR-0001 D5 sets the size and the difference large.

---

## Sources

- ADR-0001 D4, D6 and D9, ADR-0002 D3, ADR-0003 D1 to D3, in this directory
- Issue 13, the review of pull request 12: https://github.com/sqzer-dev/sqzer.dev/issues/13
- Base UI Toast: https://base-ui.com/react/components/toast, and `node_modules/@base-ui/react/toast/` at 1.8.0 for the roles, the live region and the variables
- shadcn/ui Base UI `Toast`: https://ui.shadcn.com/docs/components/base/toast
- sonner: https://github.com/emilkowalski/sonner
- Squoosh: https://squoosh.app
- WAI-ARIA 1.2, live regions: https://www.w3.org/TR/wai-aria-1.2/#aria-live
