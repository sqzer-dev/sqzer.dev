// The runs the chart draws and the trials the list shows, read off the machine (ADR-0001 D4).
import { expect, test } from 'vitest';

import { decoded, done, encoding, output } from './machine.harness';
import { currentTarget, currentTrials } from './run';

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
  search.tell({ type: 'failed', message: 'no', broken: false });
  expect(currentTrials(search.actor.getSnapshot())).toEqual([]);
  expect(currentTarget(search.actor.getSnapshot())).toBeNull();
});
