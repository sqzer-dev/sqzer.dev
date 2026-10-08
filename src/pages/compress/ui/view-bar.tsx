import { cn } from 'cn';
import { Grid2x2Icon, ImagePlusIcon, InfoIcon } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Toggle } from '@/shared/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

import { About } from './about';
import { FilePicker } from './drop-zone';

type ViewBarProps = {
  /** A plain colour is under the image, not the checkerboard. */
  flat: boolean;
  onFlat: (flat: boolean) => void;
  onPick: (file: File) => void;
  /** On its own over the image, in glass, at the bottom left. Not where it sits in the bottom expander, which is glass already. */
  floating?: boolean;
};

/** What is said of the view, not of the search: another image, what shows through a transparent one, and the page itself. */
export function ViewBar({ flat, onFlat, onPick, floating = false }: ViewBarProps) {
  return (
    <div
      data-slot="view-bar"
      className={cn('flex items-center gap-1', floating && 'glass absolute bottom-3 left-3 rounded-lg p-1')}
    >
      <FilePicker variant="ghost" onPick={onPick}>
        <ImagePlusIcon data-icon="inline-start" /> New image
      </FilePicker>
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              pressed={!flat}
              onPressedChange={(pressed) => {
                onFlat(!pressed);
              }}
              aria-label="Checkerboard under a transparent image"
            />
          }
        >
          <Grid2x2Icon />
        </TooltipTrigger>
        <TooltipContent>Checkerboard under a transparent image</TooltipContent>
      </Tooltip>
      <Popover>
        <Tooltip>
          <TooltipTrigger
            render={<PopoverTrigger render={<Button variant="ghost" size="icon" aria-label="About this page" />} />}
          >
            <InfoIcon />
          </TooltipTrigger>
          <TooltipContent>About this page</TooltipContent>
        </Tooltip>
        <PopoverContent side="top" className="w-80">
          <About />
        </PopoverContent>
      </Popover>
    </div>
  );
}
