/** The file on the page. */
export type Picked = {
  name: string;
  /** The file as it was picked: what the worker decodes. */
  bytes: ArrayBuffer;
  /** The same bytes for an `<img>`, typed so the browser reads an SVG as one. */
  blob: Blob;
  /** Drawn on the page at the width asked for, sharp at any size. */
  vector: boolean;
};

function isSvg(bytes: ArrayBuffer) {
  const head = new TextDecoder().decode(new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 4096)));
  return /<svg[\s>/]/.test(head);
}

export async function pick(file: File): Promise<Picked> {
  const bytes = await file.arrayBuffer();
  const vector = isSvg(bytes);
  const blob = new Blob([bytes], { type: vector ? 'image/svg+xml' : file.type });
  return { name: file.name || 'image', bytes, blob, vector };
}
