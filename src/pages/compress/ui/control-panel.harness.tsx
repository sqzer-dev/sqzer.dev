// The control panel in a test: over a worker that only says what it has, with the changes it reports.
import { useForm } from '@tanstack/react-form';
import { vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import type { Codec, CodecOption } from '@/shared/api';

import { SearchProvider } from '../model/context';
import { UNTOUCHED, type Controls } from '../model/controls';
import { searchMachine } from '../model/machine';
import { readyEncoder } from './compress-page.harness';
import { ControlPanel } from './control-panel';

const codec = (format: string, lossy?: boolean, options: CodecOption[] = []): Codec => ({
  format,
  extension: format,
  mime: `image/${format}`,
  decoderFeatures: [],
  encoderFeatures: [],
  ...(lossy !== undefined && {
    encoder: {
      backend: `${format}-rs`,
      tier: 'portable',
      lossy,
      lossless: !lossy,
      alpha: false,
      animation: false,
      exif: false,
      xmp: false,
      bitDepth: [8],
      options,
    },
  }),
});
// what a build could list: one lossy encoder, one that is lossless only, one format it only reads. The
// backend options are of every kind the help can say: a switch, a range, a select, and plain text
const codecs = [
  codec('jpeg', true, [
    { key: 'jpeg:progressive', default: 'true', help: 'progressive scan order; `false` writes baseline' },
    { key: 'jpeg:smoothing', default: '0', help: 'input smoothing `0..=100`, hides dithering noise' },
    { key: 'jpeg:model', default: 'ycbcr', help: '`ycbcr` or `rgb`; `rgb` is larger' },
    { key: 'jpeg:comment', default: '', help: 'a comment to write' },
  ]),
  codec('png', false, [{ key: 'png:interlace', default: 'false', help: 'write Adam7 interlaced output' }]),
  codec('tiff'),
];

/** What the form says on a change: every field, as it is then. */
type OnChange = (values: Controls) => void;

/** The workspace's part: it holds the form the controls are the fields of, as `useControlsForm` makes it. */
function Held({ onChange }: { onChange: OnChange }) {
  const form = useForm({
    defaultValues: UNTOUCHED,
    listeners: {
      onChange: ({ formApi }) => {
        onChange(formApi.state.values);
      },
    },
  });
  return <ControlPanel form={form} />;
}

/** The controls over a worker that only says what it has: a stub of every kind of backend option. */
export async function renderPanel() {
  const encoder = readyEncoder(codecs);
  const onChange = vi.fn<OnChange>();
  const screen = await render(
    <SearchProvider logic={searchMachine.provide({ actors: { encoder } })}>
      <Held onChange={onChange} />
    </SearchProvider>,
  );
  const format = screen.getByRole('combobox', { name: 'Format' });
  const pickFormat = async (name: string | RegExp) => {
    await format.click();
    await screen.getByRole('option', { name }).click();
  };
  /** What the newest change said, for the fields named. */
  const said = (...keys: (keyof Controls)[]) => {
    const values = onChange.mock.lastCall?.[0];
    return values && Object.fromEntries(keys.map((key) => [key, values[key]]));
  };
  /** A step to the right on a slider. */
  const step = async (name: string) => {
    screen.getByRole('slider', { name }).element().focus();
    await userEvent.keyboard('{ArrowRight}');
  };
  return { screen, onChange, format, pickFormat, said, step };
}
