import { cn } from 'cn';
import { useEffect, useRef, useState } from 'react';

import { bytes } from '../lib/result';
import { fetchSample, sampleUrl, SAMPLES, type Sample } from '../model/samples';

// Where each sample floats on the empty page, by the grid areas of `EmptyState`, how far it leans,
// and how wide it is (ADR-0009): as large as the window's height lets them be, and on a wide screen
// at the inner side of their cells, half-way from the corners to the middle. Each stays in its own
// cell, so none covers the middle at any size. Pointed at or focused, a sample stands straight.
const PLACES: Record<Sample['key'], string> = {
  aurora:
    '[grid-area:aurora] w-36 -rotate-3 self-end justify-self-start sm:w-[clamp(10rem,min(34dvh,24vw),36rem)] sm:self-start sm:justify-self-center lg:self-center lg:justify-self-end',
  rocket:
    '[grid-area:rocket] w-56 rotate-2 self-start justify-self-end sm:w-[clamp(11rem,min(40dvh,28vw),42rem)] sm:self-end sm:justify-self-end lg:self-center lg:justify-self-start',
  julia:
    '[grid-area:julia] w-28 -rotate-2 self-end justify-self-end sm:w-[clamp(9rem,min(30dvh,22vw),30rem)] sm:justify-self-center lg:self-start',
};

type SampleTileProps = {
  sample: Sample;
  onPick: (file: File) => void;
  /** Starts the download of this sample, ending any other still under way: the newest press wins. */
  start: () => AbortSignal;
};

/** One sample: its small copy, its name and its size. Pressed, the file is fetched and picked. */
function SampleTile({ sample, onPick, start }: SampleTileProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle');
  const { key, label, size, shown } = sample;
  const open = async () => {
    setState('loading');
    const signal = start();
    try {
      onPick(await fetchSample(sample, signal));
      setState('idle');
    } catch {
      // a download ended by a newer press, or by the page moving on, failed nothing
      setState(signal.aborted ? 'idle' : 'failed');
    }
  };
  return (
    <button
      type="button"
      data-sample={key}
      aria-busy={state === 'loading' || undefined}
      disabled={state === 'loading'}
      className={cn(
        'group flex cursor-pointer flex-col items-start gap-1.5 text-left outline-none hover:rotate-0 focus-visible:rotate-0 disabled:cursor-progress disabled:opacity-60 motion-safe:transition-transform',
        PLACES[key],
      )}
      onClick={() => {
        void open();
      }}
    >
      <img
        src={sampleUrl(shown.file)}
        width={shown.width}
        height={shown.height}
        alt=""
        className={cn(
          'h-auto w-full group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background',
          // the Julia set is its own outline; the photos are rectangles with soft corners
          key !== 'julia' && 'rounded-md',
        )}
      />
      <span className="text-xs text-muted-foreground">
        {label} <span className="font-mono">{bytes(size)}</span>
      </span>
      {state === 'failed' && (
        <span role="alert" className="text-xs text-muted-foreground">
          It did not load. Try again.
        </span>
      )}
    </button>
  );
}

/**
 * The images to try (ADR-0009), floating around the middle of the empty page, each opened as a
 * picked file is. One download at a time: a press ends the one before, and the page moving on to an
 * image, picked, dropped or pasted, ends any still under way, so a late sample never replaces it.
 */
export function Samples({ onPick }: Pick<SampleTileProps, 'onPick'>) {
  const pendingRef = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pendingRef.current?.abort();
    },
    [],
  );
  const start = () => {
    pendingRef.current?.abort();
    const pending = new AbortController();
    pendingRef.current = pending;
    return pending.signal;
  };
  return SAMPLES.map((sample) => <SampleTile key={sample.key} sample={sample} onPick={onPick} start={start} />);
}
