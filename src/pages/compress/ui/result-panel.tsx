import { DownloadIcon } from 'lucide-react';

import { useObjectUrl } from '@/shared/lib/object-url';
import { buttonVariants } from '@/shared/ui/button';

import { summarize } from '../lib/summary';
import { useSearch } from '../model/context';

/** What was made, as the command line would print it, and the file to save, hidden until there is one. */
export function ResultPanel() {
  const image = useSearch((snapshot) => snapshot.context.image);
  const result = useSearch((snapshot) => snapshot.context.result);
  const file = result?.file ?? null;
  const download = useObjectUrl<HTMLAnchorElement>(file, 'href');

  return (
    <>
      <pre className="rounded-lg border bg-card p-3 font-mono text-xs/relaxed whitespace-pre-wrap empty:hidden">
        {image && result && summarize({ name: image.name, size: image.bytes.byteLength }, result)}
      </pre>
      {/* The `href` is an object URL, made and revoked with the element by `useObjectUrl`. */}
      {/* oxlint-disable-next-line jsx-a11y/anchor-is-valid */}
      <a
        ref={download}
        className={buttonVariants({ size: 'lg', className: 'self-start' })}
        download={file?.name}
        hidden={!file}
      >
        <DownloadIcon data-icon="inline-start" />
        {file && `Download ${file.name}`}
      </a>
    </>
  );
}
