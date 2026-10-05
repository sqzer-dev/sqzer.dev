import type { Output } from '@/shared/api';

export type EncodeResult = {
  /** What the package returned: the bytes and how they were made. */
  output: Output;
  /** The bytes under the name and the type they are downloaded with. */
  file: File;
  /** How long the encode took. */
  seconds: number;
};

/** The stem of `name` with the extension of the output. */
export function rename(name: string, extension: string) {
  return `${name.replace(/\.[^./\\]*$/u, '')}.${extension}`;
}
