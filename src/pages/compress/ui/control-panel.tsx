import { useId, useRef, useState, type Ref } from 'react';

import type { Codec } from '@/shared/api';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';

import { isLossy } from '../lib/codec';
import { useSearch } from '../model/context';
import { useSolidPanels } from '../model/solid-panels';

// How long the controls rest before a search starts with what they say.
const TYPING_MS = 250;

// A label wrapped around its control, in the type of `Label`.
const WRAPPED = 'flex items-center gap-2 text-xs/relaxed font-medium';

type QualityModeProps = {
  mode: string;
  label: string;
  value: number;
  hint: string;
};

/** A way to say the quality, and the number that goes with it. */
function QualityMode({ mode, label, value, hint }: QualityModeProps) {
  return (
    <div className="flex items-center gap-2">
      <label className={WRAPPED}>
        <RadioGroupItem value={mode} /> {label}
      </label>
      <Input
        id={mode}
        name={mode}
        className="w-16 font-mono"
        type="number"
        min={0}
        max={100}
        step={1}
        defaultValue={value}
        aria-label={hint}
      />
    </div>
  );
}

type FormatSelectProps = {
  codecs: Codec[];
  format: string;
  onSelect: (format: string) => void;
};

/** Every format the package can write, as `codecs()` lists them. */
function FormatSelect({ codecs, format, onSelect }: FormatSelectProps) {
  const items = [
    { value: 'auto', label: 'chosen per image' },
    ...codecs.flatMap(({ format: value, encoder }) =>
      encoder
        ? [{ value, label: `${value.toUpperCase()}${encoder.lossy ? '' : ', lossless'} (${encoder.backend})` }]
        : [],
    ),
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="format">Format</Label>
      <Select
        name="format"
        items={items}
        value={format}
        onValueChange={(value) => {
          if (value !== null) onSelect(value);
        }}
      >
        <SelectTrigger id="format" className="min-w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** The score to search for, or a quality with no search. Neither where the encoder is lossless only. */
function Quality({ disabled, onChange }: { disabled: boolean; onChange: () => void }) {
  const legend = useId();

  return (
    <fieldset className="disabled:opacity-50" disabled={disabled}>
      <legend id={legend} className="mb-1.5 text-xs/relaxed font-medium">
        Quality
      </legend>
      <RadioGroup
        name="mode"
        className="flex w-auto gap-4"
        defaultValue="target"
        disabled={disabled}
        onValueChange={onChange}
        aria-labelledby={legend}
      >
        <QualityMode mode="target" label="score" value={70} hint="SSIMULACRA2 score to search for" />
        <QualityMode mode="quality" label="fixed" value={80} hint="Encoder quality, no search" />
      </RadioGroup>
    </fieldset>
  );
}

/** Makes every glass surface opaque, in any browser (ADR-0003 D5). It is no option of the search. */
function SolidPanels() {
  const [solid, setSolid] = useSolidPanels();

  return (
    <label className={WRAPPED}>
      <Switch checked={solid} onCheckedChange={setSolid} /> Solid panels
    </label>
  );
}

/** The controls. `onChange` is called once they have rested; `optionsOf` reads the form of `ref`. */
export function ControlPanel({ ref, onChange }: { ref: Ref<HTMLFormElement>; onChange: () => void }) {
  const codecs = useSearch((snapshot) => snapshot.context.codecs);
  const [format, setFormat] = useState('auto');
  const typing = useRef(0);

  // a native field says it changed through the form's `input`, a Base UI part through its own callback
  const rest = () => {
    clearTimeout(typing.current);
    typing.current = window.setTimeout(onChange, TYPING_MS);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <form
        ref={ref}
        className="flex flex-wrap items-end gap-x-6 gap-y-4"
        onInput={rest}
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <FormatSelect
          codecs={codecs}
          format={format}
          onSelect={(value) => {
            setFormat(value);
            rest();
          }}
        />
        <Quality disabled={!isLossy(codecs, format)} onChange={rest} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="width">Width</Label>
          <Input
            id="width"
            name="width"
            className="w-24 font-mono"
            type="number"
            min={1}
            step={1}
            placeholder="original"
            inputMode="numeric"
          />
        </div>
      </form>
      <SolidPanels />
    </div>
  );
}
