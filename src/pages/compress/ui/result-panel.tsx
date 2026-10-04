import { useObjectUrl } from '@/shared/lib/object-url';
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
      <pre id="summary">
        {image && result && summarize({ name: image.name, size: image.bytes.byteLength }, result)}
      </pre>
      <a id="download" ref={download} download={file?.name} hidden={!file}>
        {file && `Download ${file.name}`}
      </a>
    </>
  );
}
