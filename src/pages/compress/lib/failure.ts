import type { FailureKind } from '@/shared/api';

import type { Failure } from '../model/encoder';

/** What the alert knows of the search that failed: the file, and what the controls said. */
export type About = {
  /** The file on the page, or null before there is one. */
  name: string | null;
  /** The format asked for, as the package spells it, or undefined for the one it chooses. */
  format: string | undefined;
  /** The limit on the pixels the read ran under: the reader's, else the package's, or undefined while neither is known. */
  maxPixels: number | undefined;
};

/** The alert of ADR-0001 D6: one sentence that names the file and what to do, and the package's or the browser's own words after it. */
export type Explained = { sentence: string; detail: string };

/** `24 megapixels`, or `1536 pixels` under a million. */
function pixels(limit: number) {
  if (limit >= 1e6) return `${Number((limit / 1e6).toFixed(2))} megapixels`;
  return limit === 1 ? '1 pixel' : `${limit} pixels`;
}

/** `native-jxl`, or `native-jxl or native-heic`: the builds a backend is in. */
function builds(availableIn: string[] | undefined) {
  if (availableIn === undefined || availableIn.length === 0) return null;
  return availableIn.length === 1
    ? `\`${availableIn[0]}\``
    : availableIn.map((feature) => `\`${feature}\``).join(' or ');
}

/** The sentence for a failure the package named (ADR-0001 D6), one per `SqzerError` kind. */
function sentenceOf(kind: FailureKind, { message, availableIn }: Failure, { name, format, maxPixels }: About) {
  const file = name ?? 'the image';
  const elsewhere = builds(availableIn);
  switch (kind) {
    case 'UnknownFormat':
      return `${file} is no image this page knows. Choose a file in a format it reads, or one the browser can show.`;
    case 'DecoderUnavailable':
      return `This build cannot decode ${file}, and the browser could not draw it either.${elsewhere === null ? '' : ` The \`sqzer\` command line built with ${elsewhere} can.`}`;
    case 'EncoderUnavailable':
      return `This build cannot write ${format ?? 'that format'}. Choose another format.${elsewhere === null ? '' : ` The \`sqzer\` command line built with ${elsewhere} writes it.`}`;
    case 'TooLarge':
      return `${file} has more pixels than the limit${maxPixels === undefined ? '' : ` of ${pixels(maxPixels)}`}. Raise Max pixels under Advanced to read it; the tab may run out of memory far above the default.`;
    case 'InvalidInput':
      return `${file} is not a valid picture. Choose another file.`;
    case 'InvalidParams':
      return 'The package refused the options. Change the ones it names.';
    case 'Unsupported':
      return `The encoder cannot do what was asked of it for ${file}. Change the format, or the way the quality is said.`;
    case 'Codec':
      return `The encoder failed on ${file}. Try another format.`;
    case 'Transform':
      return `The resize or the colour conversion of ${file} failed. Change the resize, or the format.`;
    case 'Other':
      return `The package failed on ${file}: ${message}.`;
  }
}

/**
 * The failure in the alert's words (ADR-0001 D6): one sentence that names the file and what to
 * do, from the kind the package gave it, and the package's or the browser's own words as the
 * detail, so a bug report still carries them. `EncoderUnavailable` and `DecoderUnavailable` say
 * which build has the format, `TooLarge` gives the limit and points to Max pixels under Advanced.
 */
export function explain(failure: Failure, about: About): Explained {
  const { message, kind, stage } = failure;
  // a browser's own message may end in a full stop already
  const detail = message.replace(/\.+$/u, '');
  if (stage === 'start')
    return { sentence: 'The encoder could not start. Reload the page, or try another browser.', detail };
  if (stage === 'load')
    return { sentence: 'The encoder could not load. Reload the page: the connection may have dropped.', detail };
  if (kind === undefined) {
    const file = about.name ?? 'the image';
    const sentence =
      stage === 'read' ? `The browser could not read ${file}. Choose another file.` : `The encode of ${file} failed.`;
    return { sentence, detail };
  }
  return { sentence: sentenceOf(kind, failure, about), detail };
}
