// The page: takes a file, keeps the worker in step with the file and the
// controls, and shows what comes back. Every call into `sqzer` is in `worker.js`.
// The look and the reasons for it are docs/adr/0001-page-design.md.

// Where the slider starts. The target is the default of the command line
// and of the package; the command line has no default for `-q`.
const DEFAULTS = { target: 70, quality: 80 };
// The package's default `maxPixels`, for the one image the page draws itself.
const MAX_PIXELS = 24_000_000;
// How long an encode already running may take to finish before it is thrown away.
const PATIENCE_MS = 300;
// One rule of the chart per this many steps of quality, over the 0 to 100 every encoder takes.
const RULE_STEP = 10;
// How many fine lines the ring of the wordmark is made of.
const RING_LINES = 6;

const $ = (id) => document.getElementById(id);
const form = $("options");
const status = $("status");
const level = $("level");

let worker;
let codecs = [];
// The file on the page, as `take` makes it.
let input = null;
// The newest request, { job, options }, and the job the worker is busy with.
let wanted = null;
let running = null;
let started = 0;
let patience = 0;
let ticking = 0;
let ids = 0;
let jobs = 0;
let shown = null;
// The slider holds one value per mode, so switching back finds the old one.
const levels = { ...DEFAULTS };

function spawn() {
  const made = new Worker("worker.js", { type: "module" });
  // a worker that was ended may still have messages on their way
  made.onmessage = ({ data }) => {
    if (made === worker) on[data.type]?.(data);
  };
  made.onerror = (e) => {
    e.preventDefault();
    fail(`the encoder could not start: ${e.message ?? "this browser has no module workers"}`);
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

// As the command line reports a failure: `error: ` and the message.
function fail(text) {
  // a browser's own message may end in a full stop already
  status.textContent = `error: ${text.replace(/\.+$/, "")}`;
  status.classList.add("failed");
  busy(false);
}

// A search is running. The seconds tick next to the status line, outside
// the live region: before the first trial lands they are all that moves.
function busy(on) {
  document.body.classList.toggle("busy", on);
  clearInterval(ticking);
  $("elapsed").textContent = "";
  if (!on) return;
  // what is on the page belongs to the settings before these
  $("download").removeAttribute("href");
  if (shown) $("chip-after").textContent = "after, previous settings";
  ticking = setInterval(() => {
    $("elapsed").textContent = `${Math.round((performance.now() - started) / 1000)} s`;
  }, 1000);
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
const mode = () => ($("fixed").checked ? "quality" : "target");

// Whether quality means anything for `format`. An encoder that is lossless
// only (PNG, and WebP in this build) takes no target and no quality.
function lossy(format) {
  return format === "auto" || codec(format)?.encoder?.lossy !== false;
}

// What the controls say, as the options of the package. It validates them.
function options() {
  const data = new FormData(form);
  const out = {};
  const format = data.get("format");
  if (format !== "auto") out.format = format;
  if (lossy(format)) out[mode()] = Number(level.value);
  const width = data.get("width");
  if (width !== "") out.width = Number(width);
  return out;
}

// The same options as flags of the command line.
function command(name, { format, target, quality, width }) {
  const file = /^[\w.+-]+$/.test(name) ? name : `'${name.replaceAll("'", "'\\''")}'`;
  const flags = [];
  if (format) flags.push(`-f ${format}`);
  if (target !== undefined) flags.push(`-t ${target}`);
  if (quality !== undefined) flags.push(`-q ${quality}`);
  if (width !== undefined) flags.push(`--width ${width}`);
  return ["sqzer", file, ...flags].join(" ");
}

// Everything on the controls that follows from another control.
function refresh() {
  const format = new FormData(form).get("format");
  const searched = lossy(format);
  $("how").disabled = !searched;
  $("level-name").textContent = mode();
  $("level-value").textContent = searched ? level.value : "-";
  $("how-hint").textContent = !searched
    ? `${format.toUpperCase()} is written lossless here. Nothing to set.`
    : mode() === "target"
      ? "The smallest file that still scores this on SSIMULACRA2, found in up to six encodes."
      : "The encoder's own scale. One encode, no score.";
  const encoder = codec(format)?.encoder;
  $("format-hint").textContent = encoder
    ? `${encoder.backend}${encoder.lossy ? "" : ", lossless only"}`
    : "Chosen from what the image holds.";
  ring(searched && mode() === "target" ? Number(level.value) : 0);
}

// The ring of the wordmark is the gauge of the target: a band of fine lines
// that runs clockwise from twelve o'clock, as far round as the target is
// high. The lines keep their distance and sway together, so they leave the
// band and come back into it. No target, no lines.
function ring(target) {
  const turn = (target / 100) * 2 * Math.PI;
  const lines = [];
  for (let k = 0; k < RING_LINES && turn > 0; k++) {
    const points = [];
    for (let i = 0, steps = Math.ceil(turn / (Math.PI / 60)); i <= steps; i++) {
      const angle = (i / steps) * turn;
      const radius = 38 + k * 3.4 + 5 * Math.sin(angle * 2 + 0.6);
      points.push(`${(60 + radius * Math.sin(angle)).toFixed(2)} ${(60 - radius * Math.cos(angle)).toFixed(2)}`);
    }
    lines.push(mark("path", { d: `M${points.join("L")}` }));
  }
  $("ring-lines").replaceChildren(...lines);
}

// --- the chart --------------------------------------------------------
// The search as it happens: a point per trial at (trial, quality), a
// segment from the trial before, and the rule the search ended on. Drawn
// from what the worker reported and nothing else, in the pixels of the
// element, so a line is one pixel wide at any width.

const chart = { trials: [], max: 6, result: null };
const SVG = "http://www.w3.org/2000/svg";

function mark(name, attributes, text) {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

// `fresh` draws the newest trial in. A resize or a result redraws without it.
function draw(fresh = false) {
  const svg = $("chart");
  const { width, height } = svg.getBoundingClientRect();
  if (!width || !height) return;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const top = 24;
  const bottom = height - 24;
  const inset = 12;
  // on the half pixel, where a one pixel line is sharp
  const y = (quality) => Math.round(bottom - (quality / 100) * (bottom - top)) + 0.5;
  const x = (n, max) => Math.round(inset + ((n - 0.5) / max) * (width - 2 * inset));
  // a label goes above its point, or below when the top is in the way
  const beside = (py) => (py - top < 14 ? py + 16 : py - 8);
  const marks = [];

  for (let quality = 0; quality <= 100; quality += RULE_STEP) {
    marks.push(mark("line", { class: "rule", x1: inset, x2: width - inset, y1: y(quality), y2: y(quality) }));
  }

  const { trials, max, result } = chart;
  const searched = result?.trials?.length > 0;
  if (searched) {
    // the rule the search settled on, the only one with a name
    const at = y(result.quality);
    const reached = result.reached ? "" : " not reached";
    marks.push(mark("line", { class: "target", x1: inset, x2: width - inset, y1: at, y2: at }));
    marks.push(mark("text", { x: width - inset, y: bottom - at < 18 ? at - 6 : at + 14, "text-anchor": "end" }, `target ${result.target}${reached}: q${result.quality}`));
  }

  trials.forEach(({ n, quality, score }, i) => {
    const newest = fresh && i === trials.length - 1 ? " fresh" : "";
    const [px, py] = [x(n, max), y(quality)];
    if (i > 0) {
      // leaves one trial level and arrives at the next level: the line flows, it does not zigzag
      const [bx, by] = [x(trials[i - 1].n, max), y(trials[i - 1].quality)];
      const mid = (bx + px) / 2;
      marks.push(mark("path", { class: `segment${newest}`, pathLength: 1, d: `M${bx} ${by}C${mid} ${by} ${mid} ${py} ${px} ${py}` }));
    }
    marks.push(mark("circle", { class: `trial${newest}`, cx: px, cy: py, r: 2.5 }));
    marks.push(mark("text", { class: newest.trim(), x: px, y: beside(py), "text-anchor": "middle" }, score.toFixed(1)));
  });

  if (searched) {
    // the trial that was kept
    const kept = trials.findLast((t) => t.quality === result.quality);
    if (kept) marks.push(mark("circle", { class: "chosen", cx: x(kept.n, max), cy: y(kept.quality), r: 6 }));
  } else if (result && !result.lossless && result.quality !== undefined) {
    // a fixed quality: one encode, one point, and no score to label it with
    const [px, py] = [x(1, 1), y(result.quality)];
    marks.push(mark("circle", { class: "trial", cx: px, cy: py, r: 2.5 }));
    marks.push(mark("text", { x: px, y: beside(py), "text-anchor": "middle" }, `q${result.quality}`));
  }
  svg.replaceChildren(...marks);
}

function plot(update) {
  Object.assign(chart, update);
  draw("trials" in update && chart.trials.length > 0 && !("result" in update));
}

new ResizeObserver(() => draw()).observe($("chart"));

// --- the file ---------------------------------------------------------

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
async function rasterise(file, width) {
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

// The box the comparison is shown in: the picture's own pixels and shape.
function frame(width, height) {
  const compare = $("compare");
  compare.style.setProperty("--w", `${width}px`);
  compare.style.setProperty("--ratio", width / height);
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
  document.body.classList.add("has-file");
  $("name").textContent = input.name;
  $("chip-before").textContent = `before ${bytes(input.size)}`;
  show(null);
  // shown once the browser, or the worker for it, has a picture to show
  $("compare").hidden = true;
  $("before").src = input.url;
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
  busy(true);
  plot({ trials: [], result: null });
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
      const { data, width: w, height: h } = await rasterise(file, width);
      if (running !== job || input !== file) return;
      file.drawn = width;
      worker.postMessage({ type: "pixels", id: file.id, rgba: data.buffer, width: w, height: h }, [data.buffer]);
    } catch (e) {
      if (running !== job || input !== file) return;
      running = null;
      fail(file.unreadable ?? `the browser could not read this image: ${e.message}`);
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
  $("compare").classList.toggle("done", Boolean(result));
  $("cli").hidden = !result;
  download.hidden = !result;
  if (!result) {
    after.removeAttribute("src");
    download.removeAttribute("href");
    $("summary").replaceChildren();
    return;
  }
  const { format, backend, bytes: data, outputWidth, outputHeight, width, height } = result;
  const { mime, extension } = codec(format);
  const name = rename(input.name, extension);
  shown = URL.createObjectURL(new Blob([data], { type: mime }));
  after.src = shown;
  frame(outputWidth, outputHeight);
  $("compare").hidden = false;
  $("chip-after").textContent = `after ${bytes(data.length)}`;
  download.href = shown;
  download.download = name;
  download.textContent = `Download ${name}`;

  // the line the command line prints for a file, then what it leaves to `--json`
  const how = result.lossless
    ? "lossless"
    : `q${result.quality}${result.score === undefined ? "" : ` s${result.score.toFixed(1)}`}`;
  const first = document.createElement("span");
  first.className = "first";
  first.textContent = `${input.name} -> ${name}  ${bytes(input.size)} -> ${bytes(data.length)}  ${change(input.size, data.length)}  ${format} ${how}`;
  const lines = [
    `${width}x${height}${outputWidth === width && outputHeight === height ? "" : ` -> ${outputWidth}x${outputHeight}`}  ${result.content}  ${result.inputFormat ?? "drawn by the browser"} -> ${format} (${backend})`,
  ];
  if (result.trials?.length) {
    const reached = result.reached ? "reached" : "not reached";
    const count = result.trials.length === 1 ? "1 trial" : `${result.trials.length} trials`;
    lines.push(`target ${result.target} ${reached} in ${count}: ${result.trials.map((t) => `q${t.quality} s${t.score.toFixed(1)}`).join(", ")}`);
  }
  $("summary").replaceChildren(first, `\n${lines.join("\n")}`);
  $("command").textContent = command(input.name, wanted.options);
}

const on = {
  ready({ version, codecs: list }) {
    codecs = list;
    $("version").textContent = ` ${version}`;
    const formats = $("formats");
    if (formats.children.length === 1) {
      for (const { format, encoder } of list) {
        if (!encoder) continue;
        const label = document.createElement("label");
        const radio = document.createElement("input");
        Object.assign(radio, { type: "radio", name: "format", value: format });
        const text = document.createElement("span");
        text.textContent = format;
        label.append(radio, text);
        formats.append(label);
      }
      const own = list.filter((c) => c.decoder).map((c) => c.format.toUpperCase());
      const borrowed = list.filter((c) => !c.decoder).map((c) => c.format.toUpperCase());
      $("reads").textContent = `Reads ${own.join(", ")}. ${borrowed.join(" and ")} where the browser can.`;
    }
    refresh();
    if (!input) say("Ready.");
  },

  decoded({ id, ...info }) {
    if (id !== input?.id) return;
    input.info = info;
    if (!shown) frame(info.width, info.height);
    start();
  },

  trial({ id, job, ...trial }) {
    if (id !== input?.id || job !== wanted?.job) return;
    const { n, max, quality, score } = trial;
    say(`Encoding: trial ${n} of at most ${max}, quality ${quality} scores ${score.toFixed(1)}.`);
    plot({ trials: [...chart.trials, trial], max });
  },

  encoded({ id, job, result }) {
    if (id !== input?.id) return;
    running = null;
    // the controls moved while this one ran
    if (job !== wanted.job) return start();
    busy(false);
    show(result);
    plot({ result });
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
    if (stage === "load") return fail(`the encoder could not load: ${message}`);
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
    fail(message);
  },
};

$("before").addEventListener("load", () => {
  const { naturalWidth, naturalHeight } = $("before");
  if (!shown && naturalWidth && naturalHeight) frame(naturalWidth, naturalHeight);
  $("compare").hidden = false;
});

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
form.addEventListener("input", (e) => {
  if (e.target === $("fixed")) {
    // the slider was showing the other mode's value
    levels[mode() === "quality" ? "target" : "quality"] = Number(level.value);
    level.value = levels[mode()];
  }
  refresh();
  clearTimeout(typing);
  typing = setTimeout(sync, 250);
});
form.addEventListener("submit", (e) => e.preventDefault());

$("split").addEventListener("input", (e) => {
  $("compare").style.setProperty("--split", `${e.target.value}%`);
});

level.value = DEFAULTS.target;
refresh();
spawn();
