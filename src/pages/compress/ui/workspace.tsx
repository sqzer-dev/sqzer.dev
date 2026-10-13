import { useRef, useState, type RefObject } from 'react';

import { useMediaQuery } from '@/shared/lib/media-query';

import { useViewer } from '../model/viewer';
import { BottomExpander } from './bottom-expander';
import { Comparison } from './comparison';
import { ControlPanel } from './control-panel';
import { useControlsForm, type ControlsNow } from './form';
import { Panel } from './panel';
import { ResultChips, ResultHeadline, ResultPanel, SearchChart, useHasResult, useImageFailed } from './result-panel';
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
 * they say. On a wide screen the options float above the result in one column at the right,
 * under the output's corner label, and the view bar sits at the left. On a phone they are one
 * bottom expander: the size with the download and the view bar at its top, in sight at rest, then
 * the chart, the chips, the options, and the rest of the result under them. The result panel comes
 * with the result, or with the failure, not before.
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
  // the column is the height of the screen: between its panels the pointer reaches the image. It is
  // made apart from the view bar, which changes with the zoom, so a zoom does not draw the panels again
  // The result keeps its height, up to two fifths of the column: the options above it are what scrolls.
  // inside the screen's safe area, where the page runs under the browser's bars and the screen's edges
  const column = wide && (
    <div className="pointer-events-none absolute top-[calc(--spacing(12)+env(safe-area-inset-top))] right-[calc(--spacing(3)+env(safe-area-inset-right))] bottom-[calc(--spacing(3)+env(safe-area-inset-bottom))] flex flex-col justify-end gap-3">
      <Panel title="Options" className="pointer-events-auto">
        {controls}
      </Panel>
      {hasResult && (
        <Panel title="Result" pinned={<ResultHeadline />} className="pointer-events-auto max-h-2/5 shrink-0">
          <ResultPanel expander />
        </Panel>
      )}
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
          {column}
          <ViewBar floating flat={flat} onFlat={setFlat} onPick={onPick} scale={scale} onZoom={viewer.zoom} />
        </>
      ) : (
        <BottomExpander raise={failed}>
          <ResultHeadline chips={false} />
          <ViewBar flat={flat} onFlat={setFlat} onPick={onPick} scale={scale} onZoom={viewer.zoom} />
          <SearchChart />
          <ResultChips />
          {controls}
          <ResultPanel expander={false} chart={false} />
        </BottomExpander>
      )}
    </main>
  );
}
