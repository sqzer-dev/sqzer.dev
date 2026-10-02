// What `decodeAny` does in this browser, on the page and in a worker. The
// package's own tests run in Node, which has no canvas, so the canvas path
// of `decodeAny` is only ever checked here, by opening this page.
//
// ok     as the package documents it
// note   differs between browsers and is allowed to: read it, do not fix it
// FAIL   a defect, in the package or in this page

const where = typeof document === "undefined" ? "worker" : "page  ";

// As `../worker.js` loads it: the version of `../package.json`, from jsDelivr.
async function load() {
  const manifest = await (await fetch(new URL("../package.json", import.meta.url))).json();
  const version = manifest.dependencies.sqzer;
  const sqzer = await import(`https://cdn.jsdelivr.net/npm/sqzer@${version}/sqzer.js`);
  await sqzer.default();
  return { sqzer, version };
}

async function fixture(name) {
  const response = await fetch(new URL(`fixtures/${name}`, import.meta.url));
  return new Uint8Array(await response.arrayBuffer());
}

export async function run(say) {
  const { sqzer, version } = await load();
  say(`       ${where}  sqzer ${version}, ${navigator.userAgent}`);

  // Count the bitmaps `decodeAny` makes and the ones it closes. A bitmap
  // holds decoded pixels until it is closed, so the two must agree.
  const bitmap = globalThis.createImageBitmap;
  let made = 0;
  let closed = 0;
  globalThis.createImageBitmap = async (...args) => {
    const result = await bitmap(...args);
    made += 1;
    return result;
  };
  const close = ImageBitmap.prototype.close;
  ImageBitmap.prototype.close = function () {
    closed += 1;
    return close.call(this);
  };

  // The pixels of a decoded image: through a lossless PNG and back.
  async function pixels(image) {
    const { bytes } = image.encode({ format: "png" });
    const drawn = await bitmap(new Blob([bytes], { type: "image/png" }));
    const context = new OffscreenCanvas(drawn.width, drawn.height).getContext("2d");
    context.drawImage(drawn, 0, 0);
    const { data, width } = context.getImageData(0, 0, drawn.width, drawn.height);
    close.call(drawn);
    return (x, y) => [...data.subarray((y * width + x) * 4, (y * width + x) * 4 + 3)].join(",");
  }

  // The fixtures all hold one 48 x 32 pattern, whose blue channel steps
  // from 40 to 220 between columns 23 and 24. Drawn `scale` times larger
  // from the vector, the step stays one pixel wide; scaled up from a 48
  // pixel bitmap, it smears.
  async function sharp(image, scale) {
    const at = await pixels(image);
    const y = 5 * scale;
    const left = at(24 * scale - 1, y).split(",")[2];
    const right = at(24 * scale, y).split(",")[2];
    return left === "40" && right === "220" ? null : `blue is ${left} then ${right} across the edge, not 40 then 220`;
  }

  // One call of `decodeAny`, described: { image } or { kind, message }.
  async function decode(bytes, options) {
    try {
      return { image: await sqzer.decodeAny(bytes, options) };
    } catch (e) {
      return { kind: e?.kind ?? "not a SqzerError", message: String(e?.message ?? e) };
    }
  }

  const line = (mark, name, detail) => say(`${mark.padEnd(6)} ${where}  ${name}: ${detail}`);
  const size = (image) => `${image.width}x${image.height}`;

  const jpeg = await fixture("pattern-rgb.jpg");
  const svg = await fixture("pattern-rgb.svg");
  const heic = await fixture("pattern-rgb.heic");

  // 1. the package's own decoder comes first: no bitmap for a JPEG
  {
    const { image, kind, message } = await decode(jpeg);
    if (!image) line("FAIL", "jpeg", `${kind}: ${message}`);
    else {
      const fine = image.format === "jpeg" && size(image) === "48x32" && made === 0;
      line(fine ? "ok" : "FAIL", "jpeg", `${size(image)}, format ${image.format}, ${made} bitmaps made`);
      image.free();
    }
  }

  // 2. SVG at its own size
  let svgWorks = false;
  {
    const { image, kind, message } = await decode(svg);
    if (image) {
      svgWorks = true;
      const blur = size(image) === "48x32" && image.format === "svg" ? await sharp(image, 1) : "wrong size or format";
      line(blur ? "FAIL" : "ok", "svg", `${size(image)}, format ${image.format}${blur ? `, ${blur}` : ""}`);
      image.free();
    } else if (kind === "DecoderUnavailable" && where === "worker") {
      line("note", "svg", `not in a worker here: ${message}`);
    } else {
      line("FAIL", "svg", `${kind}: ${message}`);
    }
  }

  // 3. SVG drawn to fit a width: on the page from the vector, in a worker from a bitmap
  if (svgWorks) {
    const { image, kind, message } = await decode(svg, { width: 480 });
    if (!image) line("FAIL", "svg at width 480", `${kind}: ${message}`);
    else {
      const blur = size(image) === "480x320" ? await sharp(image, 10) : "wrong size";
      if (!blur) line("ok", "svg at width 480", `${size(image)}, sharp`);
      else if (where === "worker" && size(image) === "480x320") line("note", "svg at width 480", `${size(image)}, scaled from a bitmap: ${blur}`);
      else line("FAIL", "svg at width 480", `${size(image)}, ${blur}`);
      image.free();
    }
  }

  // 4. an image over the limit is refused, and its bitmap closed
  if (svgWorks) {
    const { image, kind, message } = await decode(svg, { maxPixels: 1000 });
    image?.free();
    line(kind === "TooLarge" ? "ok" : "FAIL", "svg over maxPixels", image ? "was decoded" : `${kind}: ${message}`);
  }

  // 5. HEIC: Safari decodes it, nothing else does
  {
    const before = made;
    const { image, kind, message } = await decode(heic);
    if (image) {
      const right = size(image) === "48x32" && image.format === "heic";
      line(right ? "ok" : "FAIL", "heic", `${size(image)}, format ${image.format}, ${made - before} bitmaps made`);
      image.free();
      const refused = await decode(heic, { maxPixels: 1000 });
      refused.image?.free();
      line(refused.kind === "TooLarge" ? "ok" : "FAIL", "heic over maxPixels", refused.image ? "was decoded" : `${refused.kind}: ${refused.message}`);
    } else if (kind === "DecoderUnavailable") {
      line("note", "heic", `not in this browser: ${message}`);
    } else {
      line("FAIL", "heic", `${kind}: ${message}`);
    }
  }

  // 6. every bitmap made was closed, the refused ones included
  line(made === closed ? "ok" : "FAIL", "bitmaps", `${made} made, ${closed} closed`);
}
