import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from '@/shared/ui/empty';

import { About } from './about';
import { FilePicker } from './drop-zone';
import { Samples } from './samples';
import { SearchFailure } from './search-failure';
import { Wordmark } from './wordmark';

type EmptyStateProps = {
  /** A file is being dragged over the window. */
  dragging: boolean;
  onPick: (file: File) => void;
};

/**
 * The page with no file on it (ADR-0001 D1): one drop target that fills the page, with the wordmark,
 * one line and the button in its middle, the images to try floating around it (ADR-0009), and the
 * privacy line and the footer at the bottom edge. A file dropped anywhere on the window counts, and the
 * target's border turns blue while one is dragged (ADR-0006). The target is a grid, so the images
 * keep clear of the middle however short the window.
 */
export function EmptyState({ dragging, onPick }: EmptyStateProps) {
  return (
    <div className="flex min-h-dvh flex-col gap-4 p-4 sm:p-6">
      <main className="flex flex-1 flex-col">
        <Empty
          className="grid grid-cols-2 grid-rows-[1fr_auto_1fr] place-items-center gap-6 lg:gap-x-12 border-2 border-dashed border-input [grid-template-areas:'aurora_julia'_'middle_middle'_'rocket_rocket'] data-dragging:border-drop sm:grid-cols-[1fr_auto_1fr] sm:[grid-template-areas:'aurora_._.'_'aurora_middle_rocket'_'julia_._rocket']"
          data-dragging={dragging || undefined}
        >
          <div className="flex flex-col items-center gap-4 [grid-area:middle]">
            <EmptyHeader>
              <Wordmark className="mb-2 text-4xl sm:text-5xl" />
              <EmptyDescription className="text-sm">Drop an image, paste one, or choose a file.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <FilePicker size="lg" onPick={onPick}>
                Choose an image
              </FilePicker>
              <SearchFailure of="encoder" />
            </EmptyContent>
          </div>
          <Samples onPick={onPick} />
        </Empty>
      </main>
      <footer>
        <About />
      </footer>
    </div>
  );
}
