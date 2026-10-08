import { Slider } from '@base-ui/react/slider';
import { ChevronsLeftRightIcon } from 'lucide-react';

type SplitHandleProps = {
  /** Where the line stands, in percent of the screen's width. */
  value: number;
  onChange: (value: number) => void;
};

// A drag moves the line in tenths of a percent, so it follows the pointer on any screen.
const STEP = 0.1;

/**
 * The line between before and after, the height of the screen, and the handle centred on it
 * (ADR-0001 D2). A slider on Base UI's parts: it has the role and the keys of a range input. Only
 * the line and its handle take the pointer; the screen around them is for zoom and pan. A drag is
 * smooth, in tenths of a percent, where a key moves a whole one. shadcn's `Slider` is a track with
 * a fill, which this is not.
 */
export function SplitHandle({ value, onChange }: SplitHandleProps) {
  return (
    <Slider.Root
      data-slot="split"
      className="pointer-events-none absolute inset-0"
      value={value}
      min={0}
      max={100}
      step={STEP}
      onValueChange={(next, { reason }) => {
        const delta = next - value;
        const whole = Math.min(Math.max(value + Math.sign(delta), 0), 100);
        onChange(reason === 'keyboard' && Math.abs(delta) < 1 ? whole : next);
      }}
    >
      <Slider.Control className="size-full">
        <Slider.Track className="size-full">
          {/* a light line with a faint dark edge, both translucent, so it shows on any image without cutting it */}
          <Slider.Thumb
            className="group pointer-events-auto h-full w-px cursor-ew-resize bg-(--white-a11) ring-1 ring-(--black-a7) before:absolute before:inset-y-0 before:-left-2 before:-right-2"
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
