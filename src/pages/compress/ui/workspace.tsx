import { useState } from 'react';

import { useMediaQuery } from '@/shared/lib/media-query';

import type { Controls } from '../model/controls';
import { BottomExpander } from './bottom-expander';
import { Comparison } from './comparison';
import { ControlPanel } from './control-panel';
import { Panel } from './panel';
import { ResultPanel } from './result-panel';
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
 * (ADR-0001 D2). Panels on a wide screen, one bottom expander on a phone.
 */
export function Workspace({ values, onChange, onPick, dragging }: WorkspaceProps) {
  const wide = useMediaQuery('(min-width: 48rem)');
  const [flat, setFlat] = useState(false);
  const controls = <ControlPanel values={values} onChange={onChange} />;

  return (
    <main
      className="fixed inset-0 overflow-hidden outline-2 -outline-offset-8 outline-transparent outline-dashed data-dragging:outline-input"
      data-dragging={dragging || undefined}
    >
      <h1 className="sr-only">sqzer</h1>
      <Comparison flat={flat} />
      {wide ? (
        <>
          <Panel title="Options" className="bottom-3 left-3">
            {controls}
          </Panel>
          <Panel title="Result" className="right-3 bottom-3">
            <ResultPanel />
          </Panel>
          <ViewBar floating flat={flat} onFlat={setFlat} onPick={onPick} />
        </>
      ) : (
        <BottomExpander>
          <ResultPanel />
          <ViewBar flat={flat} onFlat={setFlat} onPick={onPick} />
          {controls}
        </BottomExpander>
      )}
    </main>
  );
}
