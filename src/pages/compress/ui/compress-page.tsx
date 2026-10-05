import { useRef, useState } from 'react';

import { optionsOf } from '../lib/options-of';
import { useSearch, useSearchRef } from '../model/context';
import { UNTOUCHED, type Controls } from '../model/controls';
import { pick } from '../model/picked';
import { useWindowFiles } from './drop-zone';
import { EmptyState } from './empty-state';
import { Workspace } from './workspace';

// How long the controls rest before a search starts with what they say.
const TYPING_MS = 250;

/** The one page: the drop zone until there is a file (ADR-0001 D1), the image over the whole screen once there is (D2). */
export function CompressPage() {
  const search = useSearchRef();
  const hasImage = useSearch((snapshot) => snapshot.context.image !== null);
  const [values, setValues] = useState(UNTOUCHED);
  // what the controls say now, for a timer or a pick that outlives the render it started in
  const latest = useRef(UNTOUCHED);
  const resting = useRef(0);

  const options = () => optionsOf(latest.current, search.getSnapshot().context.codecs);
  const settle = () => {
    clearTimeout(resting.current);
  };

  // A picked image starts its search with what the controls say at that moment. A change still at
  // rest has nothing left to report then, and reporting it would end the worker for no reason.
  const take = async (file: File) => {
    settle();
    const image = await pick(file);
    settle();
    search.send({ type: 'picked', image, options: options() });
  };
  const onPick = (file: File) => {
    void take(file);
  };

  const change = (changed: Partial<Controls>) => {
    latest.current = { ...latest.current, ...changed };
    setValues(latest.current);
    settle();
    resting.current = window.setTimeout(() => {
      search.send({ type: 'options', options: options() });
    }, TYPING_MS);
  };

  const dragging = useWindowFiles(onPick);

  return hasImage ? (
    <Workspace values={values} onChange={change} onPick={onPick} dragging={dragging} />
  ) : (
    <EmptyState dragging={dragging} onPick={onPick} />
  );
}
