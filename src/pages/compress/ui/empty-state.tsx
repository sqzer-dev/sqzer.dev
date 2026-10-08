import { ImagePlusIcon } from 'lucide-react';

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia } from '@/shared/ui/empty';

import { About } from './about';
import { FilePicker } from './drop-zone';
import { SearchFailure } from './search-failure';

type EmptyStateProps = {
  /** A file is being dragged over the window. */
  dragging: boolean;
  onPick: (file: File) => void;
};

/**
 * The page with no file on it (ADR-0001 D1), laid out as Squoosh is: the name at the top, one large
 * drop target in the middle of the page, the privacy line and the footer at the bottom edge. A file
 * dropped anywhere on the window counts, and the target's border turns blue while one is dragged
 * (ADR-0006).
 */
export function EmptyState({ dragging, onPick }: EmptyStateProps) {
  return (
    <div className="flex min-h-dvh flex-col gap-4 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">sqzer</h1>
      </header>
      <main className="flex flex-1 flex-col">
        <Empty
          className="border-2 border-dashed border-input data-dragging:border-drop"
          data-dragging={dragging || undefined}
        >
          <EmptyHeader>
            <EmptyMedia>
              <ImagePlusIcon className="size-10 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            </EmptyMedia>
            <EmptyDescription className="text-sm">Drop an image, paste one, or choose a file.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <FilePicker size="lg" onPick={onPick}>
              Choose an image
            </FilePicker>
            <SearchFailure of="encoder" />
          </EmptyContent>
        </Empty>
      </main>
      <footer className="text-center">
        <About />
      </footer>
    </div>
  );
}
