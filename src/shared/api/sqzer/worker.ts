// The worker: every call into the `sqzer` package happens here, so a search
// that takes seconds never blocks the page. One image is held at a time.
// The messages are in `protocol.ts`.
import init, { codecs, decodeAny, fromPixels, type SqzerError, type SqzerImage } from 'sqzer';
// The version comes from the package itself: the root `package.json` and the
// lockfile are the only places it is written.
import { version } from 'sqzer/package.json';

import type { Bytes, Failure, Reply, Request } from './protocol';

function post(reply: Reply, transfer: Transferable[] = []) {
  postMessage(reply, { transfer });
}

// The package copies its output out of the module's memory, into a buffer that can be transferred.
function own(bytes: Uint8Array): Bytes {
  const { buffer, byteOffset, byteLength } = bytes;
  if (!(buffer instanceof ArrayBuffer)) throw new TypeError('the package returned bytes in a shared buffer');
  return new Uint8Array(buffer, byteOffset, byteLength);
}

async function load() {
  await init();
  post({ type: 'ready', version, codecs: codecs() });
}

// The listener below has to be there before the first message, so the load is not awaited here.
// oxlint-disable-next-line unicorn/prefer-top-level-await
const loading = load();
let image: SqzerImage | null = null;
let held = 0;

function hold(id: number, decoded: SqzerImage) {
  image?.free();
  image = decoded;
  held = id;
  const { width, height, format, alpha, animated } = decoded;
  post({ type: 'decoded', id, image: { width, height, format, alpha, animated } });
}

const isSqzerError = (thrown: unknown): thrown is SqzerError => thrown instanceof Error && thrown.name === 'SqzerError';

function failure(stage: Failure['stage'], thrown: unknown, id?: number): Failure {
  if (isSqzerError(thrown)) {
    const { kind, message, availableIn } = thrown;
    return { type: 'error', stage, id, kind, message, availableIn };
  }
  // anything else the package lets through has no `kind`
  const message = thrown instanceof Error ? thrown.message : String(thrown);
  return { type: 'error', stage, id, kind: 'Other', message };
}

async function handle(request: Request) {
  await loading;
  const { id } = request;
  try {
    if (request.type === 'decode') {
      hold(id, await decodeAny(new Uint8Array(request.bytes), { maxPixels: request.maxPixels }));
    } else if (request.type === 'pixels') {
      const { rgba, width, height, maxPixels } = request;
      hold(id, fromPixels(new Uint8ClampedArray(rgba), width, height, { maxPixels }));
    } else if (!image || id !== held) {
      // a request for an image that failed to decode, or was replaced since
    } else if (request.type === 'encode') {
      const result = image.encode({
        ...request.options,
        onTrial: (trial) => {
          post({ type: 'trial', id, trial });
        },
      });
      const bytes = own(result.bytes);
      post({ type: 'encoded', id, result: { ...result, bytes } }, [bytes.buffer]);
    } else {
      // lossless, so what the page shows as "before" is what the encoder saw
      const bytes = own(image.encode({ format: 'webp', lossless: true }).bytes);
      post({ type: 'previewed', id, bytes }, [bytes.buffer]);
    }
  } catch (thrown) {
    post(failure(request.type, thrown, id));
  }
}

// One message at a time, in order: `decodeAny` is asynchronous, and an
// encode must not start before the decode it follows has finished.
let queue = Promise.resolve();
addEventListener('message', ({ data }: MessageEvent<Request>) => {
  queue = queue.then(() => handle(data));
});

// A failed load answers every message with a rejection nobody sees, so say it once.
// oxlint-disable-next-line unicorn/prefer-top-level-await -- as above
loading.catch((thrown: unknown) => {
  post(failure('load', thrown));
});
