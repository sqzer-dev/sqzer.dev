import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from '@/shared/ui/empty';

import { About } from './about';
import { FilePicker } from './drop-zone';
import { SearchStatus } from './search-status';

type EmptyStateProps = {
  /** A file is being dragged over the window. */
  dragging: boolean;
  onPick: (file: File) => void;
};

/** The page with no file on it: one drop target that fills the viewport (ADR-0001 D1). */
export function EmptyState({ dragging, onPick }: EmptyStateProps) {
  return (
    <div
      className="flex min-h-dvh flex-col gap-4 p-4 outline-2 -outline-offset-8 outline-transparent outline-dashed data-dragging:bg-muted data-dragging:outline-input sm:p-6"
      data-dragging={dragging || undefined}
    >
      <main className="flex flex-1 flex-col">
        <Empty>
          <EmptyHeader>
            <h1 className="text-4xl font-semibold tracking-tight">sqzer</h1>
            <EmptyDescription className="text-sm">Drop an image, paste one, or choose a file.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <FilePicker size="lg" onPick={onPick}>
              Choose an image
            </FilePicker>
            <SearchStatus />
          </EmptyContent>
        </Empty>
      </main>
      <footer className="text-center">
        <About />
      </footer>
    </div>
  );
}
