import { DownloadIcon } from 'lucide-react';

import { useObjectUrl } from '@/shared/lib/object-url';
import { buttonVariants } from '@/shared/ui/button';

import { chipsOf } from '../lib/chips';
import { bytes, difference } from '../lib/result';
import { useSearch } from '../model/context';
import { Chips } from './chips';

/** The file to save, named by it for a screen reader. */
function DownloadButton({ file }: { file: File }) {
  const download = useObjectUrl<HTMLAnchorElement>(file, 'href');

  return (
    // The `href` is an object URL, made and revoked with the element by `useObjectUrl`.
    // oxlint-disable-next-line jsx-a11y/anchor-is-valid
    <a
      ref={download}
      // taller under a finger than under a mouse, as the one thing a phone's reader taps
      className={buttonVariants({
        size: 'lg',
        className:
          'shrink-0 pointer-coarse:h-11 pointer-coarse:px-4 pointer-coarse:text-sm pointer-coarse:[&_svg]:size-4',
      })}
      download={file.name}
    >
      <DownloadIcon data-icon="inline-start" />
      Download<span className="sr-only"> {file.name}</span>
    </a>
  );
}

/**
 * What the result panel leads with (ADR-0001 D5): the output's size and the difference it made,
 * set large, the download button next to them, and the chips under them. Nothing until there is
 * a result, and the result before while the next search runs. It stays in sight when the panel
 * is collapsed, and heads the bottom expander on a phone.
 */
export function ResultHeadline() {
  const before = useSearch((snapshot) => snapshot.context.image?.bytes.byteLength ?? null);
  const result = useSearch((snapshot) => snapshot.context.result);
  const codecs = useSearch((snapshot) => snapshot.context.codecs);

  if (result === null || before === null) return null;
  const { file } = result;
  return (
    <div className="flex flex-col gap-2">
      {/* the button drops under the numbers where the two do not share the line, a large size under a finger */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p data-slot="result-size" className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-xl/tight font-semibold tabular-nums">{bytes(file.size)}</span>
          <span className="text-muted-foreground">{difference(before, file.size)}</span>
        </p>
        <DownloadButton file={file} />
      </div>
      <Chips chips={chipsOf(result, codecs)} />
    </div>
  );
}
