import { useState } from 'react';

import { useMediaQuery } from '@/shared/lib/media-query';

import { useSearch } from '../model/context';
import type { Controls } from '../model/controls';
import { BottomExpander } from './bottom-expander';
import { Comparison } from './comparison';
import { ControlPanel } from './control-panel';
import { Panel } from './panel';
import { DownloadButton, ResultPanel } from './result-panel';
import { ViewBar } from './view-bar';

type WorkspaceProps = {
  values: Controls;
  onChange: (change: Partial<Controls>) => void;
  onPick: (file: File) => void;
  /** A file is being dragged over the window. */
  dragging: boolean;
};

/**
 * The page with a file on it: the image is the page, and everything else floats over it in glass
 * (ADR-0001 D2). On a wide screen the options float above the result in one column at the right,
 * under the output's corner label, and the view bar sits at the left. On a phone they are one
 * bottom expander. The result panel comes with the result, or with the failure, not before.
 */
export function Workspace({ values, onChange, onPick, dragging }: WorkspaceProps) {
  const wide = useMediaQuery('(min-width: 48rem)');
  const [flat, setFlat] = useState(false);
  const hasResult = useSearch((snapshot) => snapshot.context.result !== null || snapshot.matches({ open: 'failed' }));
  const controls = <ControlPanel values={values} onChange={onChange} />;

  return (
    <main
      className="fixed inset-0 overflow-hidden outline-2 -outline-offset-8 outline-transparent outline-dashed data-dragging:outline-drop"
      data-dragging={dragging || undefined}
    >
      <h1 className="sr-only">sqzer</h1>
      <Comparison flat={flat} />
      {wide ? (
        <>
          <div className="absolute top-12 right-3 bottom-3 flex flex-col justify-end gap-3">
            <Panel title="Options">{controls}</Panel>
            {hasResult && (
              <Panel title="Result" pinned={<DownloadButton />}>
                <ResultPanel />
              </Panel>
            )}
          </div>
          <ViewBar floating flat={flat} onFlat={setFlat} onPick={onPick} />
        </>
      ) : (
        <BottomExpander>
          <DownloadButton />
          <ResultPanel />
          <ViewBar flat={flat} onFlat={setFlat} onPick={onPick} />
          {controls}
        </BottomExpander>
      )}
    </main>
  );
}
