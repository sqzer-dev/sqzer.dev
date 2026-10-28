// The images to try on the empty page (ADR-0009): what each tile says, that its small copy is there,
// that pressing it hands the page the file, as picking it would, and that a late download never
// replaces a newer choice.
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { SAMPLES } from '../model/samples';
import { Samples } from './samples';

test('each sample is a button with its name and size, over its small copy at the size it states', async () => {
  const screen = await render(<Samples onPick={() => {}} />);

  await expect.element(screen.getByRole('button', { name: 'Aurora 562.3 KB' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Rocket fuel, 20 MP 2.1 MB' })).toBeVisible();
  await expect.element(screen.getByRole('button', { name: 'Julia set 568.5 KB' })).toBeVisible();
  const sizes = await Promise.all(
    SAMPLES.map(async ({ key }) => {
      const image = screen.container.querySelector(`[data-sample=${key}] img`);
      if (!(image instanceof HTMLImageElement)) throw new Error(`${key} has no image`);
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }),
  );
  // the small copies are served, and the size each states, which holds its place while it loads, is its own
  expect(sizes).toEqual(SAMPLES.map(({ shown: { width, height } }) => ({ width, height })));
});

test.each(SAMPLES)(
  'pressed, $label is fetched and picked as a file of its name, type and stated size',
  async (sample) => {
    const onPick = vi.fn<(file: File) => void>();
    const screen = await render(<Samples onPick={onPick} />);

    await screen.getByRole('button', { name: new RegExp(`^${sample.label}`, 'u') }).click();
    await expect.poll(() => onPick.mock.calls.length).toBe(1);
    const [file] = onPick.mock.calls[0] ?? [];
    // the size the tile states is the file's: a sample replaced without its size fails here
    expect([file?.name, file?.type, file?.size]).toEqual([sample.file, sample.type, sample.size]);
  },
);

/** The next download hangs until it is aborted; the signal it was given, to look at. */
function hangNextDownload() {
  const signals: AbortSignal[] = [];
  const fetch = vi.spyOn(window, 'fetch').mockImplementationOnce(
    (_, init) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return;
        signals.push(signal);
        signal.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      }),
  );
  return { signals, fetch };
}

test('a sample pressed while another downloads ends that download, and only the newer is picked', async () => {
  const onPick = vi.fn<(file: File) => void>();
  const { signals, fetch } = hangNextDownload();
  const screen = await render(<Samples onPick={onPick} />);

  await screen.getByRole('button', { name: /^Rocket fuel/u }).click();
  await expect.poll(() => signals.length).toBe(1);
  await screen.getByRole('button', { name: /^Aurora/u }).click();

  await expect.poll(() => onPick.mock.calls.length).toBe(1);
  expect(onPick.mock.calls[0]?.[0].name).toBe('aurora.jpg');
  expect(signals[0]?.aborted).toBe(true);
  // the rocket's tile is ready again, and says nothing failed
  await expect.element(screen.getByRole('button', { name: /^Rocket fuel/u })).toBeEnabled();
  await expect.element(screen.getByRole('alert')).not.toBeInTheDocument();
  fetch.mockRestore();
});

test('a download still under way when the page moves on to an image is ended, and picks nothing', async () => {
  const onPick = vi.fn<(file: File) => void>();
  const { signals, fetch } = hangNextDownload();
  const screen = await render(<Samples onPick={onPick} />);

  await screen.getByRole('button', { name: /^Rocket fuel/u }).click();
  await expect.poll(() => signals.length).toBe(1);
  // another image picked, dropped or pasted: the empty page, and the samples with it, go
  await screen.unmount();

  expect(signals[0]?.aborted).toBe(true);
  expect(onPick).not.toHaveBeenCalled();
  fetch.mockRestore();
});

test('a sample that does not load says so, picks nothing, and can be pressed again', async () => {
  const onPick = vi.fn<(file: File) => void>();
  const fetch = vi.spyOn(window, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));
  const screen = await render(<Samples onPick={onPick} />);
  const aurora = screen.getByRole('button', { name: /^Aurora/u });

  await aurora.click();
  // announced, as every failure is (ADR-0001 D6)
  await expect.element(screen.getByRole('alert')).toHaveTextContent('It did not load. Try again.');
  expect(onPick).not.toHaveBeenCalled();

  await aurora.click();
  await expect.poll(() => onPick.mock.calls.length).toBe(1);
  await expect.element(screen.getByRole('alert')).not.toBeInTheDocument();
  fetch.mockRestore();
});
