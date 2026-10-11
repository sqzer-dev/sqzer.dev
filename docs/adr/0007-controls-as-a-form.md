# ADR-0007: The controls are a form

**Status:** Accepted   **Date:** 2026-10-08   **Deciders:** Vlad (sole maintainer)
**Scope:** What holds what the controls say, how it becomes the package's options, where the target slider stands before it is touched, and where the toaster sits now that the Options panel is tall. ADR-0001 D3 decided what the controls are; this record decides what they are built on, as ADR-0001 item 7 builds them. ADR-0002 D10 keeps short-lived UI state in `useState`; this record adds a third holder of state, for the controls alone. ADR-0005 put the toaster at the top right; D4 moves it to the top centre on a wide screen. ADR-0003 D4 made the page monochrome but for alerts and a drop target; D5 paints the target slider's track in four hues. D6 to D8 are the maintainer's design review of the controls, in three rounds: the kinds of control, the quality as cards, the resize as a section, the defaults shown, the values typed where they are shown, and the picture holding its size on the device across the browser's zoom. Nothing else in ADR-0001 to ADR-0006 changes.

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

A slider has no empty. Until it is moved, the target slider stands at the target the newest result reports, which is the package's default for that image, read from the package at run time, when that search was asked with no way of saying the quality: a result carries what it was asked, and one asked with a score answers that score and says nothing of the default. Then, and the words next to it say `default: 70, high: barely noticeable side by side`. While there is no result yet it stands at the `web` preset's mark, which ADR-0001 D3 puts on the track anyway, and says `default`; when the result says the package went lossless for the image, it says `default: lossless for this image`. Nothing is sent until the slider is moved or a preset pressed, and the slider's value text says the same to a screen reader.

Moving the slider, pressing a preset or typing a fixed quality picks that way of saying the quality, as its radio does. Once the slider is moved, a button next to the words, `use the default`, takes it back to the package's default, since a slider cannot be cleared as a field can.

### D4. The toaster at the top centre

ADR-0005 put the viewport at the top right, under the corner label, because the top was the one edge nothing else claimed: the column of panels is anchored to the bottom right, and the Options panel was short. With every option in it the Options panel reaches the top of the column, and the search toast then lies over the format list: the Playwright suite found the click intercepted, for the thirty seconds of a search. On a wide screen the viewport moves to the top centre, on the line of the two corner labels and between them, where nothing sits: the panels are at the right, the view bar at the bottom left, the split handle at mid-height. On a phone it spans the width as before, under the labels. The stack, the announcements and the ids of ADR-0005 are unchanged.

### D5. The track of the target slider in four colours

The maintainer's review of the slider asked for a coloured track: red, yellow, green and blue for worst, good, better and visually lossless, with the preset marks crossing the track. ADR-0003 D4 made the page monochrome, with one hue for one purpose, red for an alert and blue for a drop target (ADR-0006). The track is a third purpose, and the one place on the page where a colour stands for a reading rather than a state: the four bands are the lines of section 1 of ADR-0001 two by two, `low` and `medium` in red below 70, `high` in yellow to 80, `very high` and `excellent` in green to 85 after D7, `visually lossless` in blue from there. The hues are Radix `red`, `yellow`, `green` and `blue` at step 9, the solid of each scale, as four tokens, `score-low`, `score-good`, `score-better` and `score-best`, and the track is a gradient of them with hard stops. The filled range of the slider is transparent, so the thumb reads against the band it is in. The words next to the slider say the same reading, so colour is never the only way it is said (WCAG 1.4.1). The ticks of the presets cross the track in the foreground colour, which shows on any band.

Red on the track is not an alert, and blue on it is not a drop target: the tokens are different, and the rules in `.greptile/config.json` and `CLAUDE.md` name the track as the one place for the four.

The maintainer's second look asked for the colours paler and the track thinner: the tokens are step 8 of each scale, the track is 2 px, and the ticks of the presets are 2 px thick, cross the track under the thumb, and take the colour of the band to their left, dimmed. The names of the end presets are drawn in by two characters so neither hangs past the track.

### D6. The controls, after the maintainer's review

The maintainer reviewed the controls on 2026-10-11 against Squoosh, and this is what they became:

```text
kinds       a range is a slider, with its value at the right: the target, the fixed quality, the
            effort, and a backend option whose help says `a..=b`. A backend option whose default is
            `true` or `false` is a switch. One whose help lists its values in backticks, with the
            default among them, is a select. Anything else is typed. The kind is read from what
            codecs() says of the option, in lib/option-kind.ts, and a help the page cannot read
            falls back to a field, so a new option in a release of sqzer is always reachable
defaults    a control shows the package's default until it is touched (ADR-0001 D3): a field as its
            placeholder, a select as its muted value, a switch at its state, a slider resting at it.
            A slider whose default is not a number of its range, auto or unstated, has a notch left
            of the range that means the default. Where the README states a default it is in
            lib/defaults.ts, the one copy, read again at a version bump; what it does not state
            says `default` with no number. Nothing of this is sent: an untouched control sends
            nothing, and a backend option set back to its default is empty again
quality     three cards, the title of each a radio without its circle, the active one bordered in
            gray 10 and the others dimmed to 60 %, still one radio group for the keyboard. Moving
            the slider of a card picks it
resize      one section under a switch, as on Squoosh: width and height side by side, the fit, the
            position and background where the fit takes them, a factor, enlarging and the filter.
            Off, nothing of it is sent, and the image keeps its size. ADR-0001 D3 put the width after
            the format on its own; it is in this section now
format      with the format chosen per image, the trigger names the format the newest result says the
            package chose, and the backend options behind Advanced are that format's. Before a result
            there are none to show
result      the result panel keeps its height, up to two fifths of the column, and the options panel
            above it is what scrolls, so a tall list of options no longer squeezes the result
scale       on a screen 2048 px wide or more the root type was 18 px, so the controls read larger on
            a 2K screen. Taken back in D8: the browser's own zoom does that, once the picture holds
            its size through it
```

What stays: a hidden control sends nothing, `optionsOf` is the one translation, and the package validates.

### D7. The second round of the review

The maintainer's second look, the same day:

```text
cards       a press anywhere on a quality card picks it, which the radio group hears through the
            card's data-choice; the title keeps the keys. The cards are as wide as the controls
sliders     the control of every slider has room above and below the track, 10 px each way, and the
            thumb's hit area reaches 12 px past it, so a press near the track lands
thumb       the thumb of the target slider takes the colour of the band it stands in
bands       red to 60, yellow to 70, green to 85, blue beyond: the bands end where the presets sit
resize      a row with the switch at its end, as Squoosh's, opening the section. Width and height
            show the image's own size until a side is typed, and send nothing then; a side typed
            sets the other by the image's ratio while "Keep the ratio" is on; a preset of 25 to
            100 % sets both. The package's scale key is not sent: the box says the same thing
defaults    the default is the value a field shows, not its placeholder, so a number steps from it
            and a select opens on it; the field itself stays empty and sends nothing. A value typed
            or chosen that equals the default is sent, which is the same to the package
dividers    a line between the sections behind Advanced: the encode, the limit, the backend options
asked       the package has no call that reports its defaults, effort's among them, so the page
            shows the README's numbers from lib/defaults.ts and says `default` for the rest. The
            call is asked of sqzer-dev/sqzer (the issue is linked under Sources); when it lands,
            lib/defaults.ts goes
```

### D8. The third round

```text
resize      behind an expander like Advanced, with no switch: the sides show the image's own size
            until typed and send nothing then, so nothing was needed to say the resize is off. The
            image's own size is kept apart from the size it was drawn at, which for a vector is the
            width asked for
box         width and height on one line, with the link between them as an icon button, as in
            Blender: linked, a side typed sets the other by the image's ratio. The preset under them
            is read off the sides, 25, 33.33, 50, 100, 200, 300 or 400 %, or Custom, as Squoosh
            lists them; one chosen sets both sides, and one above 100 % allows enlarging too, since
            nothing scales up without it
values      the value of every slider is typed where it is shown: the number at the right of the
            row, dotted under, opens a field in its place on a press, with the number to go to on
            Enter or on leaving it, kept within the range, and nothing on Escape. The target's
            number stands at the title row of its card, where the fixed quality's does, and the
            words under the slider say the reading alone
thumb       a step more vibrant than the band it stands in, step 9 to the track's 8, with the
            foreground as its border
zoom        the type no longer scales on a 2K screen: the browser's zoom does that. The picture
            holds its size on the device through it: the view is in the pixels of the moment the
            page loaded, the screen and every move are brought into them by the device pixel ratio
            of the moment, and the comparison takes the view back into CSS pixels. 100 % stays the
            picture's own pixels as they were at load, and the fit stays the fit
```

### D9. The bands at one brightness

Radix's steps are tuned per hue for contrast against the backgrounds of its scales, not for one brightness across hues: at step 8 in dark, the yellow reads dim and the blue bright. The four `score` tokens are OKLCH colours instead, one lightness and one chroma with the hue alone changing, 25 for red, 90 for yellow, 145 for green and 255 for blue, lighter in dark than in light; the thumb is the band's hue at more chroma, with the foreground as its border. The `yellow` and `green` scales leave the stylesheet again. The ticks cross the track over it and under the thumb, opaque, in the colour of the band to their left. The link between the sides carries a tooltip, as the view bar's buttons do.

Two more from the same look. With a fit that needs both sides, every fit but `inside`, a side of the box left at the image's own size is sent as such, since that is what the field shows: `cover` with the width typed alone no longer comes back as the package's refusal. And a value's field closes on leaving it, not on the window losing the focus to another window or frame, which the radio group's own focus handling and a test runner's parallel frames both do; the field's presses and focus stay its own, since the group selects the text of any input that gains focus inside it, which a number input refuses.

---

## 3. Options considered

**React Hook Form.** The familiar one. Rejected: listed as incompatible with the React Compiler by the plugin whose rules are errors here.

**The `useState` record, grown.** Rejected: the backend options from `codecs()` are not known until the worker reports them, and every keystroke re-rendered the panel.

**The search machine.** XState already holds state. Rejected: ADR-0002 D10 keeps the machine to the search, and the controls are not the search.

**`createFormHook` and field contexts.** TanStack's composition: tried, and dropped for the chunk it costs the first paint, as D1 says.

**A resize section without a switch, open from the start.** Keeps the width one click closer. Rejected by the review: Squoosh's switch says at a glance whether the image is resized at all, and off it sends nothing, which is what an untouched control does here.

**Parsing the help text for the kind of a backend option.** The alternative is a kind in `codecs()` itself, which is a change to `sqzer`. The help has a fixed shape at 0.3.0, and the fallback is a field, so the page loses nothing when the shape changes; asked of `sqzer` if it does.

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
- `lib/defaults.ts` is the one copy of the defaults the package's README states, and a version bump reads it again.
- ADR-0003 gets a `Superseded by` line for the four `score` tokens of D5, next to the one for ADR-0006 that it was missing. The `yellow` and `green` scales join the stylesheet's imports, light and dark, and the `one-styling-system` rule in `.greptile/config.json` and the palette line of `CLAUDE.md` name the track as the one place for them.
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
- The defaults asked of `sqzer`: https://github.com/sqzer-dev/sqzer/issues/57
- `crates/sqzer-wasm/README.md` in `sqzer-dev/sqzer`, the options and what excludes what
