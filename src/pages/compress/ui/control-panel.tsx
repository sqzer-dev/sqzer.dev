import { useRef, useState, type Ref } from 'react';

import type { Codec } from '@/shared/api';

import { isLossy } from '../lib/codec';
import { useSearch } from '../model/context';

// How long the controls rest before a search starts with what they say.
const TYPING_MS = 250;

/** A way to say the quality, and the number that goes with it. */
function QualityMode({ mode, label, value, hint }: { mode: string; label: string; value: number; hint: string }) {
  return (
    <label>
      <input type="radio" name="mode" value={mode} defaultChecked={mode === 'target'} /> {label}
      <input id={mode} name={mode} type="number" min={0} max={100} step={1} defaultValue={value} aria-label={hint} />
    </label>
  );
}

/** Every format the package can write, as `codecs()` lists them. */
function FormatSelect(props: { codecs: Codec[]; format: string; onSelect: (format: string) => void }) {
  return (
    <label>
      Format
      <select
        id="format"
        name="format"
        value={props.format}
        onChange={(event) => {
          props.onSelect(event.target.value);
        }}
      >
        <option value="auto">chosen per image</option>
        {props.codecs.map(
          (codec) =>
            codec.encoder && (
              <option key={codec.format} value={codec.format}>
                {codec.format.toUpperCase()}
                {codec.encoder.lossy ? '' : ', lossless'} ({codec.encoder.backend})
              </option>
            ),
        )}
      </select>
    </label>
  );
}

/** The controls. `onChange` is called once they have rested; `optionsOf` reads the form of `ref`. */
export function ControlPanel({ ref, onChange }: { ref: Ref<HTMLFormElement>; onChange: () => void }) {
  const codecs = useSearch((snapshot) => snapshot.context.codecs);
  const [format, setFormat] = useState('auto');
  const typing = useRef(0);

  return (
    <form
      id="options"
      ref={ref}
      onInput={() => {
        clearTimeout(typing.current);
        typing.current = window.setTimeout(onChange, TYPING_MS);
      }}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <FormatSelect codecs={codecs} format={format} onSelect={setFormat} />
      <fieldset id="how" disabled={!isLossy(codecs, format)}>
        <legend>Quality</legend>
        <QualityMode mode="target" label="score" value={70} hint="SSIMULACRA2 score to search for" />
        <QualityMode mode="quality" label="fixed" value={80} hint="Encoder quality, no search" />
      </fieldset>
      <label>
        Width
        <input id="width" name="width" type="number" min={1} step={1} placeholder="original" inputMode="numeric" />
      </label>
    </form>
  );
}
