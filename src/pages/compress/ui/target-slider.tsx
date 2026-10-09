import { cn } from 'cn';
import type { CSSProperties } from 'react';

import { Slider } from '@/shared/ui/slider';

import { describe, PRESETS, TARGET } from '../lib/score';
import { useSearch } from '../model/context';
import type { FieldOf } from './form';

type TargetSliderProps = {
  field: FieldOf<number | null>;
  /** The id of what names the slider. */
  labelledBy: string;
  /** The slider was moved, or a preset pressed: the target is what the reader asked for. */
  onMove: () => void;
};

/** What the newest result says the package did without a target: the score it searched for, or lossless. */
type Reported = number | 'lossless' | null;

const WEB = PRESETS.find((preset) => preset.name === 'web')?.score ?? TARGET.min;

/**
 * The target the newest result reports, which is the package's default for that image, or that it
 * went lossless. Only a search asked with no way of saying the quality reports a default: after
 * one asked with a score, the result answers that score, and says nothing of the default.
 */
function useReported(): Reported {
  return useSearch((snapshot) => {
    const { result } = snapshot.context;
    if (result === null) return null;
    const { asked, output } = result;
    if (asked.target !== undefined || asked.quality !== undefined || asked.lossless !== undefined) return null;
    return output.lossless ? 'lossless' : (output.target ?? null);
  });
}

/** The words next to the slider: what the chosen score looks like, or what the default is. */
function wordsFor(chosen: number | null, reported: Reported) {
  if (chosen === null) {
    if (reported === null) return 'default';
    return reported === 'lossless' ? 'default: lossless for this image' : `default: ${describe(reported)}`;
  }
  return describe(chosen);
}

/** Where a score sits on the track, as a custom property the mark is placed by. */
const at = (score: number): CSSProperties => ({
  '--at': `${((score - TARGET.min) / (TARGET.max - TARGET.min)) * 100}%`,
});

/**
 * The package's presets, marked on the track: a tick at each score, and its name under the tick.
 * Each goes to its score when pressed. The first name ends at its tick and the last starts at it,
 * so two presets ten points apart keep their names apart.
 */
function PresetMarks({ onPress }: { onPress: (score: number) => void }) {
  const last = PRESETS.length - 1;
  return (
    <div className="relative mx-1.5 h-5 text-[0.625rem]/4 text-muted-foreground">
      {PRESETS.map(({ name, score }, index) => (
        <span key={name} className="absolute left-(--at) flex flex-col items-center" style={at(score)}>
          <span className="h-1 w-px bg-input" />
          <button
            type="button"
            className={cn(
              'absolute top-1 rounded-sm px-0.5 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
              index === 0 ? 'right-0 pl-0' : index === last ? 'left-0 pr-0' : 'left-1/2 -translate-x-1/2',
            )}
            aria-label={`${name}, ${score}`}
            onClick={() => {
              onPress(score);
            }}
          >
            {name}
          </button>
        </span>
      ))}
    </div>
  );
}

/**
 * The target score (ADR-0001 D3): a slider from 30 to 100, with the words SSIMULACRA2 gives the
 * score next to it and the package's presets marked on the track. Until it is moved, it stands at
 * the target the newest result reports, which is the package's default for that image, or at the
 * `web` preset while there is none, and says so. Once moved, a button next to the words takes it
 * back to the default.
 */
export function TargetSlider({ field, labelledBy, onMove }: TargetSliderProps) {
  const chosen = field.state.value;
  const reported = useReported();
  const shown = chosen ?? (typeof reported === 'number' ? reported : WEB);
  const words = wordsFor(chosen, reported);
  const move = (score: number) => {
    onMove();
    field.handleChange(score);
  };
  const forget = () => {
    onMove();
    field.handleChange(null);
  };

  return (
    <div className="flex flex-col gap-1 pl-6">
      <Slider
        aria-labelledby={labelledBy}
        aria-describedby={`${labelledBy}-words`}
        className="px-1.5"
        thumbAlignment="center"
        min={TARGET.min}
        max={TARGET.max}
        step={1}
        value={[shown]}
        getAriaValueText={(_, value) => (chosen === null ? words : describe(value))}
        onValueChange={(value: number | readonly number[]) => {
          move(typeof value === 'number' ? value : (value[0] ?? shown));
        }}
      />
      <PresetMarks onPress={move} />
      <p id={`${labelledBy}-words`} className="text-xs/relaxed text-muted-foreground">
        <span>{words}</span>
        {chosen !== null && (
          <>
            {' '}
            <button
              type="button"
              className="rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onClick={forget}
            >
              use the default
            </button>
          </>
        )}
      </p>
    </div>
  );
}
