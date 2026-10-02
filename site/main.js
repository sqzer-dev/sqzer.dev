// The page: takes a file, keeps the worker in step with the file and the
// controls, and shows what comes back. Every call into `sqzer` is in `worker.js`.

// The package's default `maxPixels`, for the one image the page draws itself.
const MAX_PIXELS = 24_000_000;
// How long an encode already running may take to finish before it is thrown away.
const PATIENCE_MS = 300;

const $ = (id) => document.getElementById(id);
const form = $("options");
const status = $("status");

let worker;
let codecs = [];
// The file on the page, as `take` makes it.
let input = null;
// The newest request, { job, options }, and the job the worker is busy with.
let wanted = null;
let running = null;
let started = 0;
let patience = 0;
let ids = 0;
let jobs = 0;
let shown = null;

function spawn() {
  const made = new Worker("worker.js", { type: "module" });
  // a worker that was ended may still have messages on their way
  made.onmessage = ({ data }) => {
    if (made === worker) on[data.type]?.(data);
  };
  made.onerror = (e) => {
    e.preventDefault();
    fail(`The encoder could not start: ${e.message ?? "this browser has no module workers"}.`);
  };
  worker = made;
}

// The package is synchronous: a search cannot be interrupted from outside.
// The only way to stop one is to end its worker and start another.
function restart() {
  worker.terminate();
  spawn();
  running = null;
  if (!input) return;
  input.info = null;
  if (input.preview === "asked") input.preview = "wanted";
  if (wanted) start();
}

function say(text) {
  status.textContent = text;
  status.classList.remove("failed");
}

function fail(text) {
  // a browser's own message may end in a full stop already
  status.textContent = text.replace(/\.+$/, ".");
  status.classList.add("failed");
}

// `673 B`, `45.6 KB`, `1.2 MB`, as the command line prints them.
function bytes(n) {
  if (n < 1000) return `${n} B`;
  if (n < 1e6) return `${(n / 1e3).toFixed(1)} KB`;
  return `${(n / 1e6).toFixed(1)} MB`;
}

function change(before, after) {
  const percent = Math.round((after / before - 1) * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

const codec = (format) => codecs.find((c) => c.format === format);

// What the controls say, as the options of the package. It validates them.
function options() {
  const data = new FormData(form);
  const out = {};
  const format = data.get("format");
  if (format !== "auto") out.format = format;
  if (lossy(format)) {
    const mode = data.get("mode");
    const value = data.get(mode);
    if (value !== "") out[mode] = Number(value);
  }
  const width = data.get("width");
  if (width !== "") out.width = Number(width);
  return out;
}

// Whether quality means anything for `format`. An encoder that is lossless
// only (PNG, and WebP in this build) takes no target and no quality.
function lossy(format) {
  return format === "auto" || codec(format)?.encoder?.lossy !== false;
}

function isSvg(buffer) {
  const head = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 4096)));
  return /<svg[\s>/]/.test(head);
}

async function load(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// The input drawn by the browser, for what the package cannot decode: RGBA
// as `fromPixels` takes it. A vector image is drawn at `width`, sharp at any
// size; pixels are drawn at their own size and resized by the package.
async function draw(file, width) {
  const img = await load(new Blob([file.bytes], { type: file.type }));
  let { naturalWidth: w, naturalHeight: h } = img;
  if (!(w && h)) throw new Error("the browser gives no size for this image");
  if (file.vector && width) {
    h = Math.max(1, Math.round((h * width) / w));
    w = width;
  }
  if (w * h > MAX_PIXELS) {
    throw new Error(`${w}x${h} is over the limit of ${MAX_PIXELS / 1e6} megapixels`);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(img, 0, 0, w, h);
  return context.getImageData(0, 0, w, h);
}

async function take(file) {
  if (!file) return;
  if (input?.url) URL.revokeObjectURL(input.url);
  const buffer = await file.arrayBuffer();
  const vector = isSvg(buffer);
  input = {
    id: ++ids,
    name: file.name || "image",
    bytes: buffer,
    size: buffer.byteLength,
    type: vector ? "image/svg+xml" : file.type,
    vector,
    // drawn on the page instead of decoded in the worker
    canvas: vector,
    // what the worker holds: `decoded` fills it in
    info: null,
    // the width a vector image was last drawn at
    drawn: null,
    // null, "wanted", "asked" or "shown": the worker's rendering as "before"
    preview: null,
    url: "",
  };
  input.url = URL.createObjectURL(new Blob([buffer], { type: input.type }));
  show(null);
  $("compare").style.width = "";
  $("compare").style.aspectRatio = "";
  $("before").src = input.url;
  $("result").hidden = false;
  // whatever the worker is encoding is for the image that just left
  wanted = null;
  if (running !== null) restart();
  sync();
}

// Bring the worker up to date with the file and the controls.
function sync() {
  if (!input) return;
  wanted = { job: ++jobs, options: options() };
  if (running === null) return start();
  clearTimeout(patience);
  patience = setTimeout(restart, PATIENCE_MS);
}

async function start() {
  clearTimeout(patience);
  const { job, options } = wanted;
  const file = input;
  running = job;
  started = performance.now();
  // a width the package will refuse is not one to draw at
  const width = file.vector && Number.isInteger(options.width) && options.width > 0 ? options.width : 0;
  if (!file.info || (file.canvas && file.drawn !== width)) {
    // `decoded` comes back here
    say(`Reading ${file.name}.`);
    file.info = null;
    if (!file.canvas) {
      worker.postMessage({ type: "decode", id: file.id, bytes: file.bytes });
      return;
    }
    try {
      const { data, width: w, height: h } = await draw(file, width);
      if (running !== job || input !== file) return;
      file.drawn = width;
      worker.postMessage({ type: "pixels", id: file.id, rgba: data.buffer, width: w, height: h }, [data.buffer]);
    } catch (e) {
      if (running !== job || input !== file) return;
      running = null;
      fail(file.unreadable ? `${file.unreadable}.` : `The browser could not read this image: ${e.message}.`);
    }
    return;
  }
  if (file.preview === "wanted") {
    file.preview = "asked";
    worker.postMessage({ type: "preview", id: file.id });
  }
  say("Encoding.");
  worker.postMessage({ type: "encode", id: file.id, job, options });
}

// The stem of the input's name with the extension of the output.
function rename(name, extension) {
  return `${name.replace(/\.[^./\\]*$/, "")}.${extension}`;
}

// Put `result` on the page, or clear it with `null`.
function show(result) {
  if (shown) URL.revokeObjectURL(shown);
  shown = null;
  const after = $("after");
  const download = $("download");
  after.hidden = !result;
  if (!result) {
    after.removeAttribute("src");
    download.hidden = true;
    $("summary").textContent = "";
    return;
  }
  const { format, backend, bytes: data, outputWidth, outputHeight, width, height } = result;
  const { mime, extension } = codec(format);
  const name = rename(input.name, extension);
  shown = URL.createObjectURL(new Blob([data], { type: mime }));
  after.src = shown;
  $("compare").style.aspectRatio = `${outputWidth} / ${outputHeight}`;
  $("compare").style.width = `${outputWidth}px`;
  download.href = shown;
  download.download = name;
  download.textContent = `Download ${name}`;
  download.hidden = false;

  // the line the command line prints for a file, then what it leaves to `--json`
  const how = result.lossless
    ? "lossless"
    : `q${result.quality}${result.score === undefined ? "" : ` s${result.score.toFixed(1)}`}`;
  const lines = [
    `${input.name} -> ${name}  ${bytes(input.size)} -> ${bytes(data.length)}  ${change(input.size, data.length)}  ${format} ${how}`,
    `${width}x${height}${outputWidth === width && outputHeight === height ? "" : ` -> ${outputWidth}x${outputHeight}`}  ${result.content}  ${result.inputFormat ?? "drawn by the browser"} -> ${format} (${backend})`,
  ];
  if (result.trials?.length) {
    const reached = result.reached ? "reached" : "not reached";
    const count = result.trials.length === 1 ? "1 trial" : `${result.trials.length} trials`;
    lines.push(`target ${result.target} ${reached} in ${count}: ${result.trials.map((t) => `q${t.quality} s${t.score.toFixed(1)}`).join(", ")}`);
  }
  $("summary").textContent = lines.join("\n");
}

const on = {
  ready({ version, codecs: list }) {
    codecs = list;
    $("version").textContent = ` ${version}`;
    const select = $("format");
    if (select.options.length === 1) {
      for (const { format, encoder } of list) {
        if (!encoder) continue;
        const only = encoder.lossy ? "" : ", lossless";
        select.add(new Option(`${format.toUpperCase()}${only} (${encoder.backend})`, format));
      }
    }
    if (!input) say("Ready.");
  },

  decoded({ id, ...info }) {
    if (id !== input?.id) return;
    input.info = info;
    if (!shown) {
      $("compare").style.aspectRatio = `${info.width} / ${info.height}`;
      $("compare").style.width = `${info.width}px`;
    }
    start();
  },

  trial({ id, job, n, max, quality, score }) {
    if (id !== input?.id || job !== wanted?.job) return;
    say(`Encoding: trial ${n} of at most ${max}, quality ${quality} scores ${score.toFixed(1)}.`);
  },

  encoded({ id, job, result }) {
    if (id !== input?.id) return;
    running = null;
    // the controls moved while this one ran
    if (job !== wanted.job) return start();
    show(result);
    say(`Done in ${((performance.now() - started) / 1000).toFixed(1)} s.`);
  },

  previewed({ id, bytes: data }) {
    if (id !== input?.id) return;
    URL.revokeObjectURL(input.url);
    input.url = URL.createObjectURL(new Blob([data], { type: "image/webp" }));
    input.preview = "shown";
    $("before").src = input.url;
  },

  error({ id, job, stage, kind, message }) {
    if (stage === "load") return fail(`The encoder could not load: ${message}.`);
    if (id !== input?.id) return;
    if (stage === "preview") return;
    // the package has no decoder and the worker's canvas had none either:
    // the page's own `<img>` is the last one to ask
    if (stage === "decode" && kind === "DecoderUnavailable" && !input.canvas) {
      input.canvas = true;
      input.unreadable = message;
      return start();
    }
    running = null;
    if (stage === "encode" && job !== wanted.job) return start();
    show(null);
    fail(`${message}.`);
  },
};

// An image the browser cannot show itself, a TIFF say, is shown as the worker decoded it.
$("before").addEventListener("error", () => {
  if (!input || input.preview) return;
  input.preview = "wanted";
  if (input.info) {
    input.preview = "asked";
    worker.postMessage({ type: "preview", id: input.id });
  }
});

$("file").addEventListener("change", (e) => take(e.target.files[0]));

addEventListener("paste", (e) => {
  const file = e.clipboardData?.files[0];
  if (!file) return;
  e.preventDefault();
  take(file);
});

addEventListener("dragover", (e) => {
  e.preventDefault();
  document.body.classList.add("dragging");
});
addEventListener("dragleave", (e) => {
  // leaving the window, not moving from one element to the next
  if (!e.relatedTarget) document.body.classList.remove("dragging");
});
addEventListener("drop", (e) => {
  e.preventDefault();
  document.body.classList.remove("dragging");
  take(e.dataTransfer.files[0]);
});

let typing = 0;
form.addEventListener("input", () => {
  $("how").disabled = !lossy($("format").value);
  clearTimeout(typing);
  typing = setTimeout(sync, 250);
});
form.addEventListener("submit", (e) => e.preventDefault());

$("split").addEventListener("input", (e) => {
  $("compare").style.setProperty("--split", `${e.target.value}%`);
});

spawn();
