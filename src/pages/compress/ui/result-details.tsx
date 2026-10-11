import { Fragment } from 'react';

import { detailsOf, recordOf } from '../lib/result';
import { useSearch } from '../model/context';
import { Expander } from './expander';

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
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs/relaxed">
      {detailsOf({ name: image.name, size: image.bytes.byteLength }, result).map(({ term, said }) => (
        <Fragment key={term}>
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="break-words">{said}</dd>
        </Fragment>
      ))}
    </dl>
  );
  const record = (
    <pre className="font-mono text-[0.625rem]/relaxed break-all whitespace-pre-wrap">{recordOf(result.output)}</pre>
  );
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
