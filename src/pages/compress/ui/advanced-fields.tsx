import { ChevronRightIcon } from 'lucide-react';

import type { EncodeOptions } from '@/shared/api';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { FieldLegend, FieldSet } from '@/shared/ui/field';

import type { Applicable, CodecOptions } from '../lib/codec';
import { NumberField, SelectField, SwitchField, TextField } from './fields';
import type { ControlsForm } from './form';

/** The values an option takes, in the package's spelling, each with its label. Every value of the package's type, or `tsc` says which is missing. */
type Choices<Key extends 'subsampling' | 'fit' | 'position' | 'filter'> = Record<
  NonNullable<EncodeOptions[Key]>,
  string
>;

const SUBSAMPLING: Choices<'subsampling'> = { auto: 'auto', '444': '4:4:4', '422': '4:2:2', '420': '4:2:0' };
const FIT: Choices<'fit'> = {
  inside: 'inside',
  cover: 'cover',
  contain: 'contain',
  fill: 'fill',
  outside: 'outside',
};
const POSITION: Choices<'position'> = {
  center: 'center',
  top: 'top',
  bottom: 'bottom',
  left: 'left',
  right: 'right',
  'top-left': 'top left',
  'top-right': 'top right',
  'bottom-left': 'bottom left',
  'bottom-right': 'bottom right',
};
const FILTER: Choices<'filter'> = {
  lanczos3: 'lanczos3',
  mitchell: 'mitchell',
  'catmull-rom': 'catmull-rom',
  bilinear: 'bilinear',
  box: 'box',
  nearest: 'nearest',
};

/** What each option does, in the package's words. */
const HELP = {
  effort: '0 to 10. Higher is slower and smaller.',
  subsampling: 'For codecs that have it. auto lets the backend decide from the quality.',
  fast: 'One encode at the calibrated seed quality for the target, no search.',
  keepIcc: 'Instead of converting to sRGB.',
  keepMetadata: 'EXIF and XMP, instead of stripping them.',
  fit: 'How the image meets the width and height box, as CSS object-fit. Every fit but inside needs both sides.',
  position: 'Where cover crops and contain places the image.',
  background:
    'The padding of contain: #rrggbb, #rrggbbaa, white, black or transparent. The default is transparent where the format has alpha, white where it has not.',
  scale: 'A factor instead of a box: 0.5 halves both sides. Above 1 needs enlarging.',
  enlarge: 'Without it, no fit ever scales up.',
  filter: 'The resampling filter. nearest keeps the exact colours of pixel art.',
  maxPixels: 'Refuse a larger image, decoded or resized. The tab may run out of memory above the default.',
};

/** The choices of a select, from the record that lists them. */
function choices<Value extends string>(record: Record<Value, string>) {
  // the keys of a record typed by its keys
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (Object.entries(record) as [Value, string][]).map(([value, label]) => ({ value, label }));
}

type AdvancedFieldsProps = {
  form: ControlsForm;
  applies: Applicable;
};

/** The box: the height to go with the width, how the image meets the box, and where, and the padding. */
function BoxFields({ form, applies }: AdvancedFieldsProps) {
  return (
    <>
      <form.Field name="height">
        {(field) => <NumberField field={field} label="Height" placeholder="original" min={1} />}
      </form.Field>
      <form.Field name="fit">
        {(field) => <SelectField field={field} label="Fit" options={choices(FIT)} help={HELP.fit} />}
      </form.Field>
      {applies.position && (
        <form.Field name="position">
          {(field) => <SelectField field={field} label="Position" options={choices(POSITION)} help={HELP.position} />}
        </form.Field>
      )}
      {applies.background && (
        <form.Field name="background">
          {(field) => <TextField field={field} label="Background" placeholder="default" help={HELP.background} />}
        </form.Field>
      )}
    </>
  );
}

/** A factor instead of a box, whether anything scales up, and the filter. */
function ScaleFields({ form }: { form: ControlsForm }) {
  return (
    <>
      <form.Field name="scale">
        {(field) => <NumberField field={field} label="Scale" placeholder="none" min={0} step="any" help={HELP.scale} />}
      </form.Field>
      <form.Field name="enlarge">
        {(field) => <SwitchField field={field} label="Allow enlarging" help={HELP.enlarge} />}
      </form.Field>
      <form.Field name="filter">
        {(field) => <SelectField field={field} label="Filter" options={choices(FILTER)} help={HELP.filter} />}
      </form.Field>
    </>
  );
}

/** The encode: the effort, the subsampling, the search skipped, and what is kept of the input. */
function EncodeFields({ form, applies }: AdvancedFieldsProps) {
  return (
    <>
      <form.Field name="effort">
        {(field) => <NumberField field={field} label="Effort" min={0} max={10} help={HELP.effort} />}
      </form.Field>
      {applies.subsampling && (
        <form.Field name="subsampling">
          {(field) => (
            <SelectField
              field={field}
              label="Chroma subsampling"
              options={choices(SUBSAMPLING)}
              help={HELP.subsampling}
            />
          )}
        </form.Field>
      )}
      {applies.fast && (
        <form.Field name="fast">{(field) => <SwitchField field={field} label="Fast" help={HELP.fast} />}</form.Field>
      )}
      <form.Field name="keepIcc">
        {(field) => <SwitchField field={field} label="Keep the ICC profile" help={HELP.keepIcc} />}
      </form.Field>
      <form.Field name="keepMetadata">
        {(field) => <SwitchField field={field} label="Keep metadata" help={HELP.keepMetadata} />}
      </form.Field>
    </>
  );
}

/** The backend options of an encoder, as `codecs()` lists them: each with its default and its help. */
function CodecFields({ form, groups }: { form: ControlsForm; groups: CodecOptions[] }) {
  return groups.map(({ format, options }) => (
    <FieldSet key={format}>
      <FieldLegend variant="label">{format.toUpperCase()} options</FieldLegend>
      {options.map(({ key, default: fallback, help }) => (
        <form.Field key={key} name={`codecOpts.${key}`}>
          {(field) => <TextField field={field} label={key} placeholder={fallback} help={help} />}
        </form.Field>
      ))}
    </FieldSet>
  ));
}

/**
 * Every other option the package has, behind an expander that stays closed until opened (ADR-0001
 * D3). A control shows only where it applies.
 */
export function AdvancedFields({ form, applies }: AdvancedFieldsProps) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex items-center gap-1 rounded-sm text-xs/relaxed font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRightIcon className="size-3.5 transition-transform group-data-panel-open:rotate-90" /> Advanced
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 pt-3">
        <EncodeFields form={form} applies={applies} />
        <BoxFields form={form} applies={applies} />
        <ScaleFields form={form} />
        <form.Field name="maxPixels">
          {(field) => <NumberField field={field} label="Max pixels" min={1} help={HELP.maxPixels} />}
        </form.Field>
        <CodecFields form={form} groups={applies.codecOpts} />
      </CollapsibleContent>
    </Collapsible>
  );
}
