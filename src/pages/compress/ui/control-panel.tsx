import { useRef, useState, type Ref } from 'react';
import { isLossy } from '../lib/codec';
import { useSearch } from '../model/context';

// How long the controls rest before a search starts with what they say.
const TYPING_MS = 250;

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
      onSubmit={(event) => event.preventDefault()}
    >
      <label>
        Format
        <select id="format" name="format" value={format} onChange={(event) => setFormat(event.target.value)}>
          <option value="auto">chosen per image</option>
          {codecs.map(
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
      <fieldset id="how" disabled={!isLossy(codecs, format)}>
        <legend>Quality</legend>
        <label>
          <input type="radio" name="mode" value="target" defaultChecked /> score
          <input
            id="target"
            name="target"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={70}
            aria-label="SSIMULACRA2 score to search for"
          />
        </label>
        <label>
          <input type="radio" name="mode" value="quality" /> fixed
          <input
            id="quality"
            name="quality"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={80}
            aria-label="Encoder quality, no search"
          />
        </label>
      </fieldset>
      <label>
        Width
        <input id="width" name="width" type="number" min={1} step={1} placeholder="original" inputMode="numeric" />
      </label>
    </form>
  );
}
