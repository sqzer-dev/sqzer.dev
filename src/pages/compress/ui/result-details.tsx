import { CheckIcon, CopyIcon } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

import { detailsOf, recordOf } from '../lib/result';
import { useSearch } from '../model/context';
import { Expander } from './expander';

// How long the copy button says it copied.
const COPIED_MS = 1500;

/** The record the package returned, as a code block with a button that copies it: for a bug report. */
function Record({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setCopied(false);
    }, COPIED_MS);
  };
  return (
    <div className="relative w-full">
      <pre className="rounded-md border px-2 py-1 pr-8 font-mono text-[0.625rem]/relaxed break-all whitespace-pre-wrap">
        {text}
      </pre>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute top-1 right-1"
              aria-label={copied ? 'Copied' : 'Copy the record'}
              // a clipboard the browser refuses leaves the button as it was
              onClick={() => {
                copy().catch(() => null);
              }}
            />
          }
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </TooltipTrigger>
        <TooltipContent>{copied ? 'Copied' : 'Copy the record'}</TooltipContent>
      </Tooltip>
    </div>
  );
}

type ResultDetailsProps = {
  /** Behind an expander, on a wide screen. On a phone they follow on scroll, and only the record is behind one. */
  expander: boolean;
};

/**
 * Everything else of the result (ADR-0001 D5): the input, the output with its backend and tier,
 * the quality, the score with its words, the target and how the search went, the time, and the
 * full record the package returned, for a bug report. The dimensions are in the corner labels.
 */
export function ResultDetails({ expander }: ResultDetailsProps) {
  const image = useSearch((snapshot) => snapshot.context.image);
  const result = useSearch((snapshot) => snapshot.context.result);

  if (image === null || result === null) return null;
  const list = (
    // the second column may shrink below its longest word: a long name wraps, and the panel does not scroll sideways
    <dl className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 font-mono text-xs/relaxed">
      {detailsOf({ name: image.name, size: image.bytes.byteLength }, result).map(({ term, said }) => (
        <Fragment key={term}>
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="[overflow-wrap:anywhere]">{said}</dd>
        </Fragment>
      ))}
    </dl>
  );
  const record = <Record text={recordOf(result.output)} />;
  if (expander)
    return (
      <Expander title="Details">
        {list}
        {record}
      </Expander>
    );
  return (
    <>
      {list}
      <Expander title="Record">{record}</Expander>
    </>
  );
}
