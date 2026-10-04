// The page's side of the worker, and the only code that starts, ends or talks to one.
import type { Reply, Request } from './protocol';

export type Encoder = {
  send(request: Request, transfer?: Transferable[]): void;
  /** The package is synchronous: ending its worker is the only way to stop a search. */
  terminate(): void;
};

export function startEncoder({ onMessage }: { onMessage: (reply: Reply) => void }): Encoder {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

  worker.onmessage = ({ data }: MessageEvent<Reply>) => onMessage(data);
  worker.onerror = (event) => {
    event.preventDefault();
    // a script that did not load is a plain `Event`, with no message
    const message = event.message || 'this browser has no module workers';
    onMessage({ type: 'error', stage: 'start', kind: 'Other', message });
  };

  return {
    send: (request, transfer = []) => worker.postMessage(request, transfer),
    terminate() {
      // a worker that was ended may still have messages on their way
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    },
  };
}
