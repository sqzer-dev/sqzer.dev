import { useRef, useState, type RefObject } from 'react';

import { useMediaQuery } from '@/shared/lib/media-query';

import { useViewer } from '../model/viewer';
import { BottomExpander } from './bottom-expander';
import { Comparison } from './comparison';
import { ControlPanel } from './control-panel';
import { useControlsForm, type ControlsNow } from './form';
import { Panel } from './panel';
import { ResultHeadline, ResultPanel, useHasResult, useImageFailed } from './result-panel';
import { ViewBar } from './view-bar';

type WorkspaceProps = {
  /** Where the page above reads what the controls say, for an image picked while the workspace is up. */
  now: RefObject<ControlsNow | null>;
  onPick: (file: File) => void;
  /** A file is being dragged over the window. */
  dragging: boolean;
};

/**
 * The page with a file on it: the image is the page, and everything else floats over it in glass
 * (ADR-0001 D2). It holds the form the controls are the fields of, so a change of layout keeps what
 * they say. On a wide screen the options float at the right, under the output's corner label, and
 * the result at the bottom left, above the view bar: apart from the options, so a result growing
 * as the trials land moves nothing under the pointer. On a phone they are one bottom expander.
 * The result panel comes with the result, or with the failure, not before.
 */
export function Workspace({ now, onPick, dragging }: WorkspaceProps) {
  const wide = useMediaQuery('(min-width: 48rem)');
  const form = useControlsForm(now);
  const [flat, setFlat] = useState(false);
  const hasResult = useHasResult();
  // an image's failure lifts the bottom expander, so its alert is seen (ADR-0001 D6)
  const failed = useImageFailed();
  const controls = <ControlPanel form={form} />;
  // the screen the comparison fills is the page itself
  const screen = useRef<HTMLElement>(null);
  const viewer = useViewer(screen);
  const scale = viewer.view?.scale ?? null;
  // the panels are made apart from the view bar, which changes with the zoom, so a zoom does not
  // draw them again. Each sits in a box the height of the screen, and the pointer reaches the image
  // past it. The options hang from the top right; the result stands on the view bar at the bottom
  // left and grows upward, into room nothing else holds
  const options = wide && (
    <div className="pointer-events-none absolute top-12 right-3 bottom-3 flex flex-col">
      <Panel title="Options" className="pointer-events-auto">
        {controls}
      </Panel>
    </div>
  );
  const result = wide && hasResult && (
    <div className="pointer-events-none absolute top-12 bottom-15.5 left-3 flex flex-col justify-end">
      <Panel title="Result" pinned={<ResultHeadline />} className="pointer-events-auto">
        <ResultPanel expander />
      </Panel>
    </div>
  );

  return (
    <main
      ref={screen}
      className="fixed inset-0 overflow-hidden outline-2 -outline-offset-8 outline-transparent outline-dashed data-dragging:outline-drop"
      data-dragging={dragging || undefined}
    >
      <h1 className="sr-only">sqzer</h1>
      <Comparison flat={flat} viewer={viewer} />
      {wide ? (
        <>
          {options}
          {result}
          <ViewBar floating flat={flat} onFlat={setFlat} onPick={onPick} scale={scale} onZoom={viewer.zoom} />
        </>
      ) : (
        <BottomExpander raise={failed}>
          <ResultHeadline />
          <ResultPanel expander={false} />
          <ViewBar flat={flat} onFlat={setFlat} onPick={onPick} scale={scale} onZoom={viewer.zoom} />
          {controls}
        </BottomExpander>
      )}
    </main>
  );
}
