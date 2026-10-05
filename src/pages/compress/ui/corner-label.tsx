import { cn } from 'cn';

type CornerLabelProps = {
  side: 'before' | 'after';
  /** What the size is of, for a reader who cannot see which corner it sits in. */
  name: string;
  size: { width: number; height: number };
};

/** The size of one side of the comparison, in the corner over that side (ADR-0001 D2). */
export function CornerLabel({ side, name, size }: CornerLabelProps) {
  return (
    <span
      className={cn(
        'glass absolute top-2 rounded-md px-1.5 py-0.5 font-mono text-xs whitespace-nowrap',
        side === 'before' ? 'left-2' : 'right-2',
      )}
    >
      <span className="sr-only">{name}: </span>
      {size.width} × {size.height}
    </span>
  );
}
