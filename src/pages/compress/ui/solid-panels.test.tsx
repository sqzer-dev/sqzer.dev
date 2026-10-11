import { useForm } from '@tanstack/react-form';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { SearchProvider } from '../model/context';
import { UNTOUCHED } from '../model/controls';
import { searchMachine } from '../model/machine';
import { readyEncoder } from './compress-page.harness';
import { ControlPanel } from './control-panel';

/** The controls over a worker that says what it has, with the changes they report counted. */
async function renderPanel() {
  const onChange = vi.fn();
  function Held() {
    const form = useForm({
      defaultValues: UNTOUCHED,
      listeners: {
        onChange: () => {
          onChange();
        },
      },
    });
    return <ControlPanel form={form} />;
  }
  const screen = await render(
    <SearchProvider logic={searchMachine.provide({ actors: { encoder: readyEncoder([]) } })}>
      <Held />
    </SearchProvider>,
  );
  return { screen, onChange };
}

test('"Solid panels" makes the glass opaque from `<html>`, keeps the choice, and is no change of the controls', async () => {
  localStorage.clear();
  const { screen, onChange } = await renderPanel();
  const solid = screen.getByRole('switch', { name: 'Solid panels' });
  await expect.element(solid).not.toBeChecked();
  expect(document.documentElement.dataset['panels']).toBe('glass');

  await solid.click();

  await expect.element(solid).toBeChecked();
  expect(document.documentElement.dataset['panels']).toBe('solid');
  expect(localStorage.getItem('panels')).toBe('solid');
  expect(onChange).not.toHaveBeenCalled();
});

test('"Solid panels" starts as it was left', async () => {
  localStorage.setItem('panels', 'solid');
  const { screen } = await renderPanel();

  await expect.element(screen.getByRole('switch', { name: 'Solid panels' })).toBeChecked();
  expect(document.documentElement.dataset['panels']).toBe('solid');
  localStorage.clear();
});
