import { useId } from 'react';

import type { Codec } from '@/shared/api';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

import { isLossy } from '../lib/codec';
import { useSearch } from '../model/context';
import type { Controls } from '../model/controls';
import { SolidPanels } from './solid-panels';

// A label wrapped around its control, in the type of `Label`.
const WRAPPED = 'flex items-center gap-2 text-xs/relaxed font-medium';

type Change = (change: Partial<Controls>) => void;

type QualityModeProps = {
  mode: Controls['mode'];
  label: string;
  value: string;
  /** What an empty field says. The package has a default score, and the page does not restate it (ADR-0001 D3). */
  placeholder?: string;
  hint: string;
  onChange: Change;
};

/** A way to say the quality, and the number that goes with it. */
function QualityMode({ mode, label, value, placeholder, hint, onChange }: QualityModeProps) {
  return (
    <div className="flex items-center gap-2">
      <label className={WRAPPED}>
        <RadioGroupItem value={mode} /> {label}
      </label>
      <Input
        className="w-24 font-mono"
        type="number"
        min={0}
        max={100}
        step={1}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange({ [mode]: event.target.value });
        }}
        aria-label={hint}
      />
    </div>
  );
}

type FormatSelectProps = {
  codecs: Codec[];
  format: string;
  onChange: Change;
};

/** Every format the package can write, as `codecs()` lists them. */
function FormatSelect({ codecs, format, onChange }: FormatSelectProps) {
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
        items={items}
        value={format}
        onValueChange={(value) => {
          if (value !== null) onChange({ format: value });
        }}
      >
        <SelectTrigger id="format" className="w-full">
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

type QualityProps = {
  values: Controls;
  disabled: boolean;
  onChange: Change;
};

/** The score to search for, or a quality with no search. Neither where the encoder is lossless only. */
function Quality({ values, disabled, onChange }: QualityProps) {
  const legend = useId();

  return (
    <fieldset className="disabled:opacity-50" disabled={disabled}>
      <legend id={legend} className="mb-1.5 text-xs/relaxed font-medium">
        Quality
      </legend>
      <RadioGroup
        className="flex w-auto flex-wrap gap-x-4 gap-y-2"
        value={values.mode}
        disabled={disabled}
        onValueChange={(mode: unknown) => {
          if (mode === 'target' || mode === 'quality') onChange({ mode });
        }}
        aria-labelledby={legend}
      >
        <QualityMode
          mode="target"
          label="score"
          value={values.target}
          placeholder="default"
          hint="SSIMULACRA2 score to search for"
          onChange={onChange}
        />
        <QualityMode
          mode="quality"
          label="fixed"
          value={values.quality}
          hint="Encoder quality, no search"
          onChange={onChange}
        />
      </RadioGroup>
    </fieldset>
  );
}

/**
 * The controls, showing `values`. A field that was not touched is empty and sends nothing, so the
 * defaults stay the package's (ADR-0001 D3).
 */
export function ControlPanel({ values, onChange }: { values: Controls; onChange: Change }) {
  const codecs = useSearch((snapshot) => snapshot.context.codecs);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <FormatSelect codecs={codecs} format={values.format} onChange={onChange} />
      <Quality values={values} disabled={!isLossy(codecs, values.format)} onChange={onChange} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="width">Width</Label>
        <Input
          id="width"
          className="w-24 font-mono"
          type="number"
          min={1}
          step={1}
          value={values.width}
          placeholder="original"
          inputMode="numeric"
          onChange={(event) => {
            onChange({ width: event.target.value });
          }}
        />
      </div>
      <SolidPanels />
    </form>
  );
}
