import { cn } from 'cn';
import { Grid2x2Icon, ImagePlusIcon, InfoIcon, ScanIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Toggle } from '@/shared/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

import { About } from './about';
import { FilePicker } from './drop-zone';
import { ZoomField } from './zoom-field';

type ViewBarProps = {
  /** A plain colour is under the image, not the checkerboard. */
  flat: boolean;
  onFlat: (flat: boolean) => void;
  onPick: (file: File) => void;
  /** The picture's scale, in screen pixels per image pixel. Null until the picture is measured. */
  scale: number | null;
  /** A step in or out, the fit, or a scale to go to. */
  onZoom: (to: 'in' | 'out' | 'fit' | number) => void;
  /** On its own over the image, in glass, at the bottom left. Not where it sits in the bottom expander, which is glass already, and where the bar wraps on a narrow phone. */
  floating?: boolean;
};

/** What is said of the view, not of the search: another image, how close it is, what shows through a transparent one, and the page itself. */
export function ViewBar({ flat, onFlat, onPick, scale, onZoom, floating = false }: ViewBarProps) {
  return (
    <div
      data-slot="view-bar"
      className={cn(
        'flex items-center gap-1',
        floating ? 'glass absolute bottom-3 left-3 rounded-lg p-1' : 'flex-wrap',
      )}
    >
      <FilePicker variant="ghost" onPick={onPick}>
        <ImagePlusIcon data-icon="inline-start" /> New image
      </FilePicker>
      <Action label="Zoom out" onClick={() => onZoom('out')}>
        <ZoomOutIcon />
      </Action>
      <ZoomField scale={scale} onZoom={onZoom} />
      <Action label="Zoom in" onClick={() => onZoom('in')}>
        <ZoomInIcon />
      </Action>
      <Action label="Fit to the screen" onClick={() => onZoom('fit')}>
        <ScanIcon />
      </Action>
      <Checkerboard flat={flat} onFlat={onFlat} />
      <AboutButton />
    </div>
  );
}

function Checkerboard({ flat, onFlat }: Pick<ViewBarProps, 'flat' | 'onFlat'>) {
  return (
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
  );
}

function AboutButton() {
  return (
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
  );
}

type ActionProps = {
  /** The button's name, and its tooltip. */
  label: string;
  onClick: () => void;
  children: ReactNode;
};

/** An icon button of the bar, named by its tooltip. */
function Action({ label, onClick, children }: ActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label={label} onClick={onClick} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
