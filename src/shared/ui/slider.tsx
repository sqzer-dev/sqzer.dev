import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { cn } from 'cn';
import type * as React from 'react';

type SliderProps = SliderPrimitive.Root.Props & {
  /** What a screen reader says for a value, in place of the number. */
  getAriaValueText?: SliderPrimitive.Thumb.Props['getAriaValueText'];
  /** On the track, over its plain `gray 10`: a scale drawn on it, say. */
  trackClassName?: string;
  /** On the filled range: `bg-transparent` where the track is the scale. */
  indicatorClassName?: string;
  /** On the thumb: a colour read off the scale, say. */
  thumbClassName?: string;
  /** Drawn over the track and under the thumbs: marks on the scale, say. Positioned against the control, which the track fills. */
  children?: React.ReactNode;
};

// The control takes the pointer, so its padding is the room around the track a press lands in.
const CONTROL =
  'relative flex w-full touch-none items-center py-2.5 select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col data-vertical:px-2.5 data-vertical:py-0';
// The track, thin; the indicator fills it to the thumb.
const TRACK =
  'relative grow overflow-hidden rounded-md bg-input select-none data-horizontal:h-0.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-0.5';
// The thumb: a small square with its hit area reaching past it.
const THUMB =
  'relative block size-3 shrink-0 rounded-md border border-ring bg-background ring-ring transition-[color,box-shadow] select-none after:absolute after:-inset-3 hover:ring-2 focus-visible:ring-2 focus-visible:outline-hidden active:ring-2 disabled:pointer-events-none disabled:opacity-50';

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  getAriaValueText,
  trackClassName,
  indicatorClassName,
  thumbClassName,
  children,
  ...props
}: SliderProps) {
  const values = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max];

  return (
    <SliderPrimitive.Root
      className={cn('data-horizontal:w-full data-vertical:h-full', className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className={CONTROL}>
        <SliderPrimitive.Track data-slot="slider-track" className={cn(TRACK, trackClassName)}>
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className={cn('bg-primary select-none data-horizontal:h-full data-vertical:w-full', indicatorClassName)}
          />
        </SliderPrimitive.Track>
        {children}
        {Array.from({ length: values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            getAriaValueText={getAriaValueText}
            className={cn(THUMB, thumbClassName)}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
