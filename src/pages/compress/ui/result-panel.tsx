import { DownloadIcon } from 'lucide-react';

import { useObjectUrl } from '@/shared/lib/object-url';
import { buttonVariants } from '@/shared/ui/button';

import { summarize } from '../lib/summary';
import { useSearch } from '../model/context';
import { SearchFailure } from './search-failure';

/** The file to save, once there is one. It stays in sight when the result panel is collapsed. */
export function DownloadButton() {
  const file = useSearch((snapshot) => snapshot.context.result?.file ?? null);
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
          'max-w-full pointer-coarse:h-11 pointer-coarse:px-4 pointer-coarse:text-sm pointer-coarse:[&_svg]:size-4',
      })}
      download={file?.name}
      hidden={!file}
    >
      <DownloadIcon data-icon="inline-start" />
      {/* a long name is cut, not the panel */}
      <span className="truncate">{file && `Download ${file.name}`}</span>
    </a>
  );
}

/** What was made, as the command line would print it, or why nothing was. */
/** Whether there is a result panel to show: a result, or the failure in its place (ADR-0001 D6). */
export function useHasResult() {
  return useSearch((snapshot) => snapshot.context.result !== null || snapshot.matches({ open: 'failed' }));
}

export function ResultPanel() {
  const image = useSearch((snapshot) => snapshot.context.image);
  const result = useSearch((snapshot) => snapshot.context.result);

  return (
    <div className="flex flex-col items-start gap-3">
      <SearchFailure of="image" />
      <pre className="font-mono text-xs/relaxed whitespace-pre-wrap empty:hidden">
        {image && result && summarize({ name: image.name, size: image.bytes.byteLength }, result)}
      </pre>
    </div>
  );
}
