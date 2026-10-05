import { expect, test } from 'vitest';

import { run, type Check } from './decode-any.checks';

const failures = (checks: Check[]) => checks.filter((check) => check.mark === 'FAIL');

async function runInWorker() {
  const worker = new Worker(new URL('./decode-any.worker.ts', import.meta.url), { type: 'module' });
  try {
    return await new Promise<Check[]>((resolve, reject) => {
      worker.addEventListener('message', ({ data }: MessageEvent<Check[]>) => {
        resolve(data);
      });
      worker.addEventListener('error', (event) => {
        reject(new Error(`the worker did not start: ${event.message}`));
      });
    });
  } finally {
    worker.terminate();
  }
}

test('`decodeAny` on the page', async () => {
  const checks = await run();

  expect(failures(checks)).toEqual([]);
  // an SVG is drawn from the vector on the page, in every browser
  expect(checks.find((check) => check.name === 'svg at width 480')?.mark).toBe('ok');
});

test('`decodeAny` in a worker', async () => {
  const checks = await runInWorker();

  expect(failures(checks)).toEqual([]);
  expect(checks.find((check) => check.name === 'jpeg')?.mark).toBe('ok');
});
