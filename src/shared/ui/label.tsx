import { cn } from 'cn';
import * as React from 'react';

/** Names the control whose `id` is `htmlFor`. A label wrapped around its control is a plain `<label>`. */
function Label({ className, htmlFor, ...props }: React.ComponentProps<'label'> & { htmlFor: string }) {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        'flex items-center gap-2 text-xs/relaxed leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
