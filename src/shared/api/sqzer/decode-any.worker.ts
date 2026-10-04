// The checks of `decode-any.checks.ts` again, inside a worker.
import { run, type Check } from './decode-any.checks';

const failed = (thrown: unknown): Check[] => [
  { mark: 'FAIL', name: 'worker', detail: `the checks did not run: ${String(thrown)}` },
];

postMessage(await run().catch(failed));
