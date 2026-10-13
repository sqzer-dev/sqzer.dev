// The runs the chart draws and the trials the list shows, read off the machine (ADR-0001 D4).
import { expect, test } from 'vitest';

import type { Codec } from '@/shared/api';

import { decoded, done, encoding, output, picked } from './machine.harness';
import { currentTarget, currentTrials } from './run';

const encoder = (format: string, lossy: boolean): Codec => ({
  format,
  extension: format,
  mime: `image/${format}`,
  decoderFeatures: [],
  encoderFeatures: [],
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
    options: [],
  },
});
const lossy = (format: string) => encoder(format, true);
const lossless = (format: string) => encoder(format, false);

test('the trials of every search gone by stay as runs, as far as each got', () => {
  const search = encoding();
  const trial = (quality: number, score: number) => {
    search.tell({ type: 'trial', trial: { n: 1, max: 6, quality, score } });
  };
  trial(60, 68);
  search.tell(done);
  expect(search.actor.getSnapshot().context.runs).toEqual([]);
  // the next search puts the result's behind it
  search.actor.send({ type: 'options', options: { target: 80 } });
  expect(search.actor.getSnapshot().context.runs).toEqual([[{ n: 1, max: 6, quality: 60, score: 68 }]]);
  expect(search.actor.getSnapshot().context.trials).toEqual([]);
  // a search cut short by the controls moving stays as far as it got
  trial(75, 79);
  search.actor.send({ type: 'options', options: { target: 82 } });
  search.clock.increment(300);
  search.tell(decoded());
  expect(search.actor.getSnapshot().context.runs[1]).toEqual([{ n: 1, max: 6, quality: 75, score: 79 }]);
  // one cancelled with no trial yet adds no run
  search.actor.send({ type: 'cancel' });
  search.actor.send({ type: 'options', options: { target: 90 } });
  search.tell(decoded());
  expect(search.actor.getSnapshot().context.runs).toHaveLength(2);
});

test('the chart keeps the newest five runs, and the oldest goes as another lands', () => {
  const search = encoding();
  for (let n = 1; n <= 7; n++) {
    search.tell({ type: 'trial', trial: { n: 1, max: 6, quality: n, score: 50 } });
    search.tell(done);
    search.actor.send({ type: 'options', options: { target: 50 + n } });
  }

  const { runs } = search.actor.getSnapshot().context;
  expect(runs).toHaveLength(5);
  expect(runs[0]?.[0]?.quality).toBe(3);
  expect(runs.at(-1)?.[0]?.quality).toBe(7);
});

test('the chart draws the running search as it lands, then the result as the package reports it', () => {
  const search = encoding();
  expect(currentTrials(search.actor.getSnapshot())).toEqual([]);
  // the search was asked for no score, so the rule stands at the package's documented default
  expect(currentTarget(search.actor.getSnapshot())).toBe(70);
  search.tell({ type: 'trial', trial: { n: 1, max: 6, quality: 60, score: 68 } });
  expect(currentTrials(search.actor.getSnapshot())).toEqual([{ n: 1, max: 6, quality: 60, score: 68 }]);

  const reported = { ...output, target: 72, trials: [{ quality: 60, score: 68 }] };
  search.tell({ type: 'done', result: { output: reported, file: new File([], 'a.avif'), seconds: 1 } });
  expect(currentTrials(search.actor.getSnapshot())).toEqual([{ quality: 60, score: 68 }]);
  expect(currentTarget(search.actor.getSnapshot())).toBe(72);

  // a fixed quality searches for no score
  search.actor.send({ type: 'options', options: { quality: 80 } });
  expect(currentTarget(search.actor.getSnapshot())).toBeNull();
  search.tell(done);
  expect(currentTrials(search.actor.getSnapshot())).toEqual([]);
  expect(currentTarget(search.actor.getSnapshot())).toBeNull();
});

test("the rule is the running search's target, not the controls that moved on, and none for a lossless encode", () => {
  const search = encoding();
  search.actor.send({ type: 'ready', version: '0.3.0', codecs: [lossy('avif'), lossless('png')] });
  search.tell({ type: 'trial', trial: { n: 1, max: 6, quality: 60, score: 68 } });
  search.actor.send({ type: 'options', options: { target: 85 } });
  expect(currentTarget(search.actor.getSnapshot())).toBe(70);
  expect(currentTrials(search.actor.getSnapshot())).toHaveLength(1);
  // once the patience runs out, the search about to start is the one on the chart, with no trial yet
  search.clock.increment(300);
  expect(currentTarget(search.actor.getSnapshot())).toBe(85);
  expect(currentTrials(search.actor.getSnapshot())).toEqual([]);

  // an encoder that is lossless only searches for no score, and a result gone lossless reports the target it was asked
  search.tell(decoded());
  search.actor.send({ type: 'options', options: { format: 'png' } });
  search.clock.increment(300);
  search.tell(decoded());
  expect(currentTarget(search.actor.getSnapshot())).toBeNull();
  const went = { ...output, lossless: true, target: 70 };
  search.tell({ type: 'done', result: { output: went, file: new File([], 'a.png'), seconds: 1 } });
  expect(currentTarget(search.actor.getSnapshot())).toBeNull();
});

test('another image picked shows none of the trials of the one before while it is read', () => {
  const search = encoding();
  search.tell({ type: 'trial', trial: { n: 1, max: 6, quality: 60, score: 68 } });
  search.tell({
    type: 'done',
    result: { output: { ...output, trials: [{ quality: 60, score: 68 }] }, file: new File([], 'a.avif'), seconds: 1 },
  });

  search.actor.send({ type: 'picked', image: picked('b.jpg'), options: {} });

  expect(currentTrials(search.actor.getSnapshot())).toEqual([]);
  expect(search.actor.getSnapshot().context.runs).toEqual([[{ n: 1, max: 6, quality: 60, score: 68 }]]);
});

test('a cancelled search leaves the result before it on the chart, and a failure clears it', () => {
  const search = encoding();
  const reported = { ...output, target: 70, trials: [{ quality: 60, score: 68 }] };
  search.tell({ type: 'done', result: { output: reported, file: new File([], 'a.avif'), seconds: 1 } });
  search.actor.send({ type: 'options', options: { target: 85 } });
  search.tell({ type: 'trial', trial: { n: 1, max: 6, quality: 80, score: 83 } });
  expect(currentTarget(search.actor.getSnapshot())).toBe(85);

  search.actor.send({ type: 'cancel' });
  expect(currentTrials(search.actor.getSnapshot())).toEqual([{ quality: 60, score: 68 }]);
  expect(currentTarget(search.actor.getSnapshot())).toBe(70);

  search.actor.send({ type: 'options', options: { target: 90 } });
  search.tell(decoded());
  search.tell({ type: 'failed', stage: 'encode', message: 'no', broken: false });
  expect(currentTrials(search.actor.getSnapshot())).toEqual([]);
  expect(currentTarget(search.actor.getSnapshot())).toBeNull();
});
