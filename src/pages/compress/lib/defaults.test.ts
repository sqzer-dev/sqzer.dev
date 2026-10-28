import { expect, test } from 'vitest';

import { defaultsOf, defaultTarget, restingAt } from './defaults';

test('the defaults are what `options()` lists, spelled as it spells them, and a key with none is left out', () => {
  const defaults = defaultsOf([
    { key: 'target', default: '70', help: 'SSIMULACRA2 score to reach' },
    { key: 'width', help: 'target width in pixels' },
    { key: 'background', default: 'auto', help: 'padding of contain' },
  ]);
  expect(defaults).toEqual({ target: '70', background: 'auto' });
  expect(defaultTarget(defaults)).toBe(70);
  // before a worker has loaded the package, no target is known
  expect(defaultTarget({})).toBeNull();
});

test('a control rests at a default that is a number, and at a notch for one that is a word', () => {
  expect(restingAt('6')).toBe(6);
  expect(restingAt('auto')).toBe('auto');
});
