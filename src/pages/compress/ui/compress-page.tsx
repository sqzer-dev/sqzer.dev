import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/ui/button';
import { useToastManager } from '@/shared/ui/toast';

import { optionsOf } from '../lib/options-of';
import { useSearch, useSearchRef } from '../model/context';
import { UNTOUCHED, type Controls } from '../model/controls';
import { useNotices } from '../model/notices';
import { pick } from '../model/picked';
import { useWindowFiles } from './drop-zone';
import { EmptyState } from './empty-state';

// How long the controls rest before a search starts with what they say.
const TYPING_MS = 250;

// The workspace, with the drawer, the popover and the tooltip it brings, is a chunk of its own, off
// the first paint: the empty state has no use for it. It is fetched once the empty state is up. A
// chunk that did not download fails again from the module map, so the way back is a reload, and
// `lazy` gets a component that says so instead of an error it would throw past every boundary.
const load = () => import('./workspace');
const Workspace = lazy(() =>
  load().then(
    (module) => ({ default: module.Workspace }),
    () => ({ default: WorkspaceMissing }),
  ),
);

/** In the workspace's place when its chunk did not download. */
function WorkspaceMissing() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-md border border-destructive bg-alert px-3 py-2 text-xs/relaxed text-alert-foreground"
      >
        <p>The rest of the page did not load. Reloading it fetches it again.</p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            location.reload();
          }}
        >
          Reload the page
        </Button>
      </div>
    </main>
  );
}

/** Tells the toaster what the machine is doing (ADR-0005). On its own, so a toast re-renders nothing else. */
function Notices() {
  useNotices(useToastManager());
  return null;
}

/** The one page: the drop zone until there is a file (ADR-0001 D1), the image over the whole screen once there is (D2). */
export function CompressPage() {
  const search = useSearchRef();
  const hasImage = useSearch((snapshot) => snapshot.context.image !== null);
  const [values, setValues] = useState(UNTOUCHED);
  // what the controls say now, for a timer or a pick that outlives the render it started in
  const latest = useRef(UNTOUCHED);
  const resting = useRef(0);

  useEffect(() => {
    // a download that fails is dealt with where the workspace is rendered, not here
    load().catch(() => null);
  }, []);

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
  const empty = <EmptyState dragging={dragging} onPick={onPick} />;

  return (
    <>
      <Notices />
      {hasImage ? (
        // the empty state stays up while the workspace is on its way, which is once
        <Suspense fallback={empty}>
          <Workspace values={values} onChange={change} onPick={onPick} dragging={dragging} />
        </Suspense>
      ) : (
        empty
      )}
    </>
  );
}
