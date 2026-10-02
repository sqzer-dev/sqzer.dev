// The worker: every call into the `sqzer` package happens here, so a search
// that takes seconds never blocks the page. One image is held at a time.
//
// in   { type: "decode", id, bytes }                  a file, as an ArrayBuffer
//      { type: "pixels", id, rgba, width, height }    RGBA the page drew itself
//      { type: "encode", id, job, options }           options of the package
//      { type: "preview", id, options }               the input as the browser can show it
// out  { type: "ready", version, codecs }
//      { type: "decoded", id, width, height, format, alpha, animated }
//      { type: "trial", id, job, n, max, quality, score }
//      { type: "encoded", id, job, result }
//      { type: "previewed", id, bytes }
//      { type: "error", id, job, stage, kind, message, availableIn }

// `package.json` is the one place the version is written, and the place
// Dependabot bumps it. Nothing is installed: the package comes from jsDelivr.
async function load() {
  const manifest = await fetch(new URL("package.json", import.meta.url));
  if (!manifest.ok) throw new Error(`package.json: HTTP ${manifest.status}`);
  const version = (await manifest.json()).dependencies.sqzer;
  const sqzer = await import(`https://cdn.jsdelivr.net/npm/sqzer@${version}/sqzer.js`);
  await sqzer.default();
  postMessage({ type: "ready", version, codecs: sqzer.codecs() });
  return sqzer;
}

const loading = load();
let image = null;
let held = 0;

function hold(id, decoded) {
  image?.free();
  image = decoded;
  held = id;
  const { width, height, format, alpha, animated } = decoded;
  postMessage({ type: "decoded", id, width, height, format, alpha, animated });
}

async function handle(message) {
  const sqzer = await loading;
  const { type, id, job } = message;
  // a message for an image that failed to decode, or was replaced since
  if ((type === "encode" || type === "preview") && id !== held) return;
  try {
    if (type === "decode") {
      hold(id, await sqzer.decodeAny(new Uint8Array(message.bytes)));
    } else if (type === "pixels") {
      const { rgba, width, height } = message;
      hold(id, sqzer.fromPixels(new Uint8ClampedArray(rgba), width, height));
    } else if (type === "encode") {
      const result = image.encode({
        ...message.options,
        onTrial: (trial) => postMessage({ type: "trial", id, job, ...trial }),
      });
      postMessage({ type: "encoded", id, job, result }, [result.bytes.buffer]);
    } else if (type === "preview") {
      // lossless, so what the page shows as "before" is what the encoder saw
      const { bytes } = image.encode({ ...message.options, format: "webp", lossless: true });
      postMessage({ type: "previewed", id, bytes }, [bytes.buffer]);
    }
  } catch (e) {
    const { kind = "Other", message: text = String(e), availableIn } = e ?? {};
    postMessage({ type: "error", id, job, stage: type, kind, message: text, availableIn });
  }
}

// One message at a time, in order: `decodeAny` is asynchronous, and an
// encode must not start before the decode it follows has finished.
let queue = Promise.resolve();
onmessage = ({ data }) => {
  queue = queue.then(() => handle(data));
};

// A failed load answers every message with a rejection nobody sees, so say it once.
loading.catch((e) => {
  postMessage({ type: "error", stage: "load", kind: "Other", message: String(e?.message ?? e) });
});
