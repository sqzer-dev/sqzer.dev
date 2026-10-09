# ADR-0007: The controls are a form

**Status:** Accepted   **Date:** 2026-10-08   **Deciders:** Vlad (sole maintainer)
**Scope:** What holds what the controls say, how it becomes the package's options, where the target slider stands before it is touched, and where the toaster sits now that the Options panel is tall. ADR-0001 D3 decided what the controls are; this record decides what they are built on, as ADR-0001 item 7 builds them. ADR-0002 D10 keeps short-lived UI state in `useState`; this record adds a third holder of state, for the controls alone. ADR-0005 put the toaster at the top right; D4 moves it to the top centre on a wide screen. Nothing else in ADR-0001 to ADR-0006 changes.

---

## 1. Context

Until item 7 the controls were five fields, held by the page as one `useState` record with an `onChange` of a partial, and every keystroke re-rendered the whole panel. Item 7 grows them to every option the package has, eighteen fields, plus the backend options `codecs()` lists per encoder, which are not known until the worker reports them and cannot be fields of a fixed record. The maintainer asked for a form library on 2026-10-05, naming TanStack Form, and confirmed the timing: with item 7, where the controls grow, not before.

The constraint is the React Compiler (ADR-0002 D6). `eslint-plugin-react-hooks` 7.1.1 lists React Hook Form as incompatible with it, for `watch`, and the repository has that rule as an error. `@tanstack/react-form` is not on the list, and the page is where the maintainer wants to try the newer tool. Checked at 1.33.5, MIT:

```text
bundle      22 kB gzip more in the workspace chunk, 59 to 81, with the new fields in it. The first
            paint is unchanged: the page's chunk goes from 146.7 to 145.8 kB gzip, because the
            workspace holds the form (D1)
policy      no `<style>` element, no request. The Playwright suite watches both
devtools    `form-core` carries a devtools event client that dispatches `CustomEvent`s on `window`
            and retries a connection five times, a second apart, then gives up. No console output,
            nothing leaves the page
compiler    `pnpm lint` passes with every compiler rule on. A ref handed to a hook has to end in
            `Ref`, or the immutability rule takes a write to it for a mutated argument
```

What the package does with a combination it refuses was tried at 0.3.0, so the page knows what not to send rather than checking twice (ADR-0001 D3):

```text
position without cover or contain   InvalidParams
fast with quality or lossless       InvalidParams
cover with one side                 InvalidParams, which the page leaves to the package: the alert says so
jpeg:progressive with AVIF          taken: an option of another codec is ignored
lossless with JPEG                  Unsupported, which the page avoids by showing lossless only where
                                    codecs() says the encoder has it
```

---

## 2. Decision

### D1. One form, held by the workspace, with its fields handed to the field components

What the controls say is one `@tanstack/react-form` form, `useForm` with the untouched controls as its default values and no validators: the package validates, and `InvalidParams` is the alert of ADR-0001 D6. The workspace holds it, above the panels, so a change of layout between the column of a wide screen and the bottom expander of a phone keeps what the controls say, and the empty state carries none of it: the form library stays in the workspace's lazy chunk. The page above reaches it through one ref, `ControlsNow`, for an image picked while the workspace is up: the options as the controls stand, and the change still at rest, dropped, as before.

The form's `listeners.onChange` is where the page's typing timer starts, and the search gets what every field says when it fires. The three values that decide what applies, the format, the mode and the fit, are read with `useSelector` on the form's store, so a keystroke in a field re-renders that field and nothing else.

Each field component takes its field as a prop, `FieldOf<Value>`, the shape the form's `Field` hands its render prop: what it says, `handleChange`, `handleBlur`. TanStack's `createFormHook`, which binds field components to the form through contexts, was tried first and dropped: it imports every field component where the form is made, which put the fields and their Base UI parts in the first paint's chunk.

### D2. `optionsOf` is the one place the form becomes a call, and `applicable` says what applies

`optionsOf` in `src/pages/compress/lib/` turns the form's values into the package's options, and nothing else assembles an option. A field that was not touched is left out, so the defaults stay the package's (ADR-0001 D3), and so is a control that does not apply to what the others say. `applicable` in `lib/codec.ts` decides both, from `codecs()`:

```text
target, quality      where the encoder is lossy, or the format is chosen per image
lossless             where the encoder has it, or the format is chosen per image
subsampling          as target
fast                 as target, and only with a target: the package refuses it with the rest
position             with cover or contain
background           with contain
codecOpts            the chosen encoder's, as codecs() lists them with their default and help.
                     With the format chosen per image, every encoder's: the package takes them all
maxPixels            at the decode as well as the encode: the package's limit is checked where the
                     image is read, so a new limit reads the image again, and it is the way through
                     for a file over the default, as ADR-0001 D3 means it to be
```

A control that does not apply is not shown, and a control that is not shown sends nothing. What was typed into it stays in the form, for when it applies again: the backend options of every encoder are kept by their key, and a format chosen back finds them as they were. A way of saying the quality the chosen encoder has not, lossless under JPEG, reads as the target, which is the package's default, so the radios always describe what is sent; the choice stays in the form for a format that has it. The limit reaches the page's own drawing too: an SVG drawn for the package is checked against the `maxPixels` asked for, not a fixed number.

### D3. The untouched target stands at the reported target, or the `web` mark

A slider has no empty. Until it is moved, the target slider stands at the target the newest result reports, which is the package's default for that image, read from the package at run time, and the words next to it say `default: 70, high: barely noticeable side by side`. While there is no result yet it stands at the `web` preset's mark, which ADR-0001 D3 puts on the track anyway, and says `default`; when the result says the package went lossless for the image, it says `default: lossless for this image`. Nothing is sent until the slider is moved or a preset pressed, and the slider's value text says the same to a screen reader.

Moving the slider, pressing a preset or typing a fixed quality picks that way of saying the quality, as its radio does. Once the slider is moved, a button next to the words, `use the default`, takes it back to the package's default, since a slider cannot be cleared as a field can.

### D4. The toaster at the top centre

ADR-0005 put the viewport at the top right, under the corner label, because the top was the one edge nothing else claimed: the column of panels is anchored to the bottom right, and the Options panel was short. With every option in it the Options panel reaches the top of the column, and the search toast then lies over the format list: the Playwright suite found the click intercepted, for the thirty seconds of a search. On a wide screen the viewport moves to the top centre, between the two corner labels, where nothing sits: the panels are at the right, the view bar at the bottom left, the split handle at mid-height. On a phone it spans the width as before. The stack, the announcements and the ids of ADR-0005 are unchanged.

---

## 3. Options considered

**React Hook Form.** The familiar one. Rejected: listed as incompatible with the React Compiler by the plugin whose rules are errors here.

**The `useState` record, grown.** Rejected: the backend options from `codecs()` are not known until the worker reports them, and every keystroke re-rendered the panel.

**The search machine.** XState already holds state. Rejected: ADR-0002 D10 keeps the machine to the search, and the controls are not the search.

**`createFormHook` and field contexts.** TanStack's composition: tried, and dropped for the chunk it costs the first paint, as D1 says.

**The column of panels starting lower, under the toaster.** Keeps ADR-0005 as it is. Rejected: the stack is up to three toasts tall and the Options panel would lose that height to scrolling for the whole search, while the top centre is free.

---

## 4. Trade-offs

**A third holder of state.** XState for the search, `useState` for what is short-lived, and now a form for the controls. Each has one job, and the form is reached from the page through one ref.

**22 kB gzip** in the workspace chunk, which is fetched once the empty state is up (ADR-0002, pull request 14) and never for a reader who drops nothing.

**The devtools client** that `form-core` carries looks for devtools for five seconds once the form is mounted, on the window's event target, and then stops. It sends nothing anywhere.

**A number from the docs.** The `web` mark at 70 is the package's documented default, and the one number the page shows before the package has said it. It is labelled `default`, and the result's own number replaces it within seconds.

---

## 5. Consequences

- `CLAUDE.md` gets the form and `optionsOf` under its rules, and the `codecs-drive-the-controls` rule in `.greptile/config.json` names them.
- ADR-0005 gets a `Superseded by` line for the viewport's place; its row in `docs/adr/README.md` and its entry in `.greptile/files.json` stay as they are, since the record still says what it says.
- `@tanstack/react-form` is a dependency at an exact version, with `@tanstack/form-core`, `@tanstack/store`, `@tanstack/react-store`, `@tanstack/pacer-lite` and `@tanstack/devtools-event-client` under it, all MIT. Vite lists their licences.
- Validation, if the page ever wants to say something before the package does, has a place: the form's validators. ADR-0001 D3 says not to, and this record changes nothing there.
- ADR-0001 items 8 and 9 build on the form: the chips of D5 are what `optionsOf` sent.

---

## 6. Action items

1. [x] The form, the target slider, the quality choice and the Advanced expander, in the pull request of ADR-0001 item 7.

---

## Sources

- ADR-0001 D3 and item 7, ADR-0002 D6 and D10, in this directory
- TanStack Form: https://tanstack.com/form/latest, `listeners`: https://tanstack.com/form/latest/docs/framework/react/guides/listeners
- `eslint-plugin-react-hooks`, the libraries it lists as incompatible with the React Compiler: https://github.com/facebook/react/blob/main/packages/eslint-plugin-react-hooks/src/rules/IncompatibleLibrary.ts
- SSIMULACRA2, the meaning of its scores: https://github.com/cloudinary/ssimulacra2
- `crates/sqzer-wasm/README.md` in `sqzer-dev/sqzer`, the options and what excludes what
