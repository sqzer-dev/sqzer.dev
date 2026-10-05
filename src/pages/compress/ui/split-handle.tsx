import { Slider } from '@base-ui/react/slider';
import { ChevronsLeftRightIcon } from 'lucide-react';

type SplitHandleProps = {
  /** Where the line stands, in percent of the picture's width. */
  value: number;
  onChange: (value: number) => void;
};

/**
 * The line between before and after, and the handle centred on it (ADR-0001 D2). A slider on
 * Base UI's parts: it has the role and the keys of a range input, and a press anywhere on the
 * picture brings the line there. shadcn's `Slider` is a track with a fill, which this is not.
 */
export function SplitHandle({ value, onChange }: SplitHandleProps) {
  return (
    <Slider.Root className="size-full" value={value} min={0} max={100} onValueChange={onChange}>
      <Slider.Control className="size-full cursor-ew-resize touch-none">
        <Slider.Track className="size-full">
          {/* a light line between two dark ones, so it shows on any image */}
          <Slider.Thumb
            className="group h-full w-0.5 bg-primary-foreground ring-1 ring-primary"
            aria-label="Before on the left, after on the right"
          >
            <span className="absolute top-1/2 left-1/2 grid size-8 -translate-1/2 place-items-center rounded-full border border-primary-foreground bg-primary text-primary-foreground group-has-focus-visible:ring-2 group-has-focus-visible:ring-ring">
              <ChevronsLeftRightIcon className="size-4" />
            </span>
          </Slider.Thumb>
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}
