import { lazy, Suspense, useEffect, useRef } from 'react';

import { useToastManager } from '@/shared/ui/toast';

import { useSearch, useSearchRef } from '../model/context';
import { useNotices } from '../model/notices';
import { pick } from '../model/picked';
import { useWindowFiles } from './drop-zone';
import { EmptyState } from './empty-state';
import type { ControlsNow } from './form';
import { WorkspaceMissing } from './workspace-missing';

// The workspace, with the drawer, the popover and the tooltip it brings, is a chunk of its own, off
// the first paint: the empty state has no use for it. It is fetched once the empty state is up. A
// chunk that did not download fails again from the module map, so the way back is a reload, and
// `lazy` gets a component that says so instead of an error it would throw past every boundary.
const load = () => import('./workspace');
const Workspace = lazy(() =>
  load()
    .then((module) => ({ default: module.Workspace }))
    .catch(() => ({ default: WorkspaceMissing })),
);

/** Tells the toaster what the machine is doing (ADR-0005). On its own, so a toast re-renders nothing else. */
function Notices() {
  useNotices(useToastManager());
  return null;
}

/** The one page: the drop zone until there is a file (ADR-0001 D1), the image over the whole screen once there is (D2). */
export function CompressPage() {
  const search = useSearchRef();
  const hasImage = useSearch((snapshot) => snapshot.context.image !== null);
  // what the controls say, once the workspace holds them
  const now = useRef<ControlsNow | null>(null);

  useEffect(() => {
    // a download that fails is dealt with where the workspace is rendered, not here
    load().catch(() => null);
  }, []);

  // A picked image starts its search with what the controls say at that moment, and drops a change
  // still at rest (`ControlsNow`). Before the workspace is up, nobody has touched anything.
  const take = async (file: File) => {
    now.current?.settle();
    const image = await pick(file);
    now.current?.settle();
    search.send({ type: 'picked', image, options: now.current?.options() ?? {} });
  };
  const onPick = (file: File) => {
    void take(file);
  };

  const dragging = useWindowFiles(onPick);
  const empty = <EmptyState dragging={dragging} onPick={onPick} />;

  return (
    <>
      <Notices />
      {hasImage ? (
        // the empty state stays up while the workspace is on its way, which is once
        <Suspense fallback={empty}>
          <Workspace now={now} onPick={onPick} dragging={dragging} />
        </Suspense>
      ) : (
        empty
      )}
    </>
  );
}
