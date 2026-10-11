import { Link2Icon, Unlink2Icon } from 'lucide-react';

import { Toggle } from '@/shared/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

import type { FieldOf } from './form';

/** The link between the sides of the box, as in Blender: on, a side typed sets the other by the image's ratio. */
export function RatioLink({ field }: { field: FieldOf<boolean> }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Toggle
            variant="outline"
            pressed={field.state.value}
            aria-label="Keep the ratio"
            onPressedChange={(pressed) => {
              field.handleChange(pressed);
            }}
          />
        }
      >
        {field.state.value ? <Link2Icon /> : <Unlink2Icon />}
      </TooltipTrigger>
      <TooltipContent>Keep the ratio</TooltipContent>
    </Tooltip>
  );
}
