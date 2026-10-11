import { useSelector } from '@tanstack/react-form';

import { applicable } from '../lib/codec';
import { useSearch } from '../model/context';
import { AdvancedFields } from './advanced-fields';
import type { ControlsForm } from './form';
import { FormatField } from './format-field';
import { QualityFields } from './quality-fields';
import { ResizeFields } from './resize-fields';
import { SolidPanels } from './solid-panels';

/**
 * The controls, as the fields of `form` (ADR-0007): the format, the quality, the resize, and every
 * other option behind Advanced (ADR-0001 D3). A field that was not touched shows the package's
 * default and sends nothing.
 */
export function ControlPanel({ form }: { form: ControlsForm }) {
  const codecs = useSearch((snapshot) => snapshot.context.codecs);
  const chosen = useSearch((snapshot) => snapshot.context.result?.output.format ?? null);
  // what the others say decides which controls apply, and only these four do
  const format = useSelector(form.store, (state) => state.values.format);
  const mode = useSelector(form.store, (state) => state.values.mode);
  const fit = useSelector(form.store, (state) => state.values.fit);
  const resize = useSelector(form.store, (state) => state.values.resize);
  const applies = applicable({ format, mode, fit, resize }, codecs, chosen);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <form.Field name="format">{(field) => <FormatField field={field} chosen={chosen} />}</form.Field>
      {applies.quality && <QualityFields form={form} applies={applies} />}
      <ResizeFields form={form} applies={applies} />
      <AdvancedFields form={form} applies={applies} />
      <SolidPanels />
    </form>
  );
}
