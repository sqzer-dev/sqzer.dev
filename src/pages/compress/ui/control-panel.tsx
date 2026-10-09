import { useSelector } from '@tanstack/react-form';

import { applicable } from '../lib/codec';
import { useSearch } from '../model/context';
import { AdvancedFields } from './advanced-fields';
import { NumberField } from './fields';
import type { ControlsForm } from './form';
import { FormatField } from './format-field';
import { QualityFields } from './quality-fields';
import { SolidPanels } from './solid-panels';

/**
 * The controls, as the fields of `form` (ADR-0007): the format, the quality, the width, and every
 * other option behind Advanced (ADR-0001 D3). A field that was not touched is empty and sends
 * nothing, so the defaults stay the package's.
 */
export function ControlPanel({ form }: { form: ControlsForm }) {
  const codecs = useSearch((snapshot) => snapshot.context.codecs);
  // what the others say decides which controls apply, and only those three do
  const format = useSelector(form.store, (state) => state.values.format);
  const mode = useSelector(form.store, (state) => state.values.mode);
  const fit = useSelector(form.store, (state) => state.values.fit);
  const applies = applicable({ format, mode, fit }, codecs);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <form.Field name="format">{(field) => <FormatField field={field} />}</form.Field>
      {applies.quality && <QualityFields form={form} applies={applies} />}
      <form.Field name="width">
        {(field) => <NumberField field={field} label="Width" placeholder="original" min={1} />}
      </form.Field>
      <AdvancedFields form={form} applies={applies} />
      <SolidPanels />
    </form>
  );
}
