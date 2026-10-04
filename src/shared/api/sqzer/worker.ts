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
const own = (bytes: Uint8Array) => bytes as Bytes;

async function load() {
  await init();
  post({ type: 'ready', version, codecs: codecs() });
}

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

function failure(stage: Failure['stage'], thrown: unknown, id?: number): Failure {
  // the package throws a `SqzerError`. anything else has no `kind`
  const { kind = 'Other', message = String(thrown), availableIn } = (thrown ?? {}) as Partial<SqzerError>;
  return { type: 'error', stage, id, kind, message, availableIn };
}

async function handle(request: Request) {
  await loading;
  const { id } = request;
  try {
    if (request.type === 'decode') {
      hold(id, await decodeAny(new Uint8Array(request.bytes)));
    } else if (request.type === 'pixels') {
      const { rgba, width, height } = request;
      hold(id, fromPixels(new Uint8ClampedArray(rgba), width, height));
    } else if (!image || id !== held) {
      // a request for an image that failed to decode, or was replaced since
    } else if (request.type === 'encode') {
      const result = image.encode({
        ...request.options,
        onTrial: (trial) => post({ type: 'trial', id, trial }),
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
loading.catch((thrown: unknown) => post(failure('load', thrown)));
