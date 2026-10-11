import { cn } from 'cn';
import type { CSSProperties } from 'react';

import { Slider } from '@/shared/ui/slider';

import { DEFAULTS } from '../lib/defaults';
import { BANDS, describe, PRESETS, share, TARGET, words } from '../lib/score';
import { useSearch } from '../model/context';
import { EditableValue } from './editable-value';
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

/** The words under the slider: what the chosen score looks like, or what the default is. */
function wordsFor(chosen: number | null, reported: Reported) {
  if (chosen === null) {
    if (reported === 'lossless') return 'default: lossless for this image';
    return `default: ${words(reported ?? DEFAULTS.target)}`;
  }
  return words(chosen);
}

/** The score the slider stands at: what was chosen, else what the result reports, else the package's documented default. */
const standing = (chosen: number | null, reported: Reported) =>
  chosen ?? (typeof reported === 'number' ? reported : DEFAULTS.target);

/** The target's number, at the title row, typed where it is shown. */
export function TargetValue({ field, onMove }: Pick<TargetSliderProps, 'field' | 'onMove'>) {
  const chosen = field.state.value;
  const reported = useReported();
  const shown = standing(chosen, reported);
  return (
    <EditableValue
      text={String(shown)}
      start={shown}
      min={TARGET.min}
      max={TARGET.max}
      label="Target score"
      onCommit={(score) => {
        onMove();
        field.handleChange(score);
      }}
    />
  );
}

/** Where a score sits on the track, as a custom property the mark is placed by. */
const at = (score: number): CSSProperties => ({ '--at': `${share(score)}%` });

/** The band a score is in, which is the one to the left of a tick drawn at it. */
const bandOf = (score: number) => BANDS.toReversed().find((band) => band.from < score)?.token ?? BANDS[0].token;

/** The band the thumb stands in: at a band's start it is in that band, as the words say. */
const bandAt = (score: number) => BANDS.toReversed().find((band) => band.from <= score)?.token ?? BANDS[0].token;

/**
 * The track as a scale: four bands, red to blue from worst to visually lossless, in the `score`
 * tokens (ADR-0007 D5). The words next to the slider carry the same reading, so colour is not the
 * only way it is said.
 */
const TRACK: CSSProperties = {
  '--track': `linear-gradient(to right, ${BANDS.map(({ from, token }, index) => {
    const to = BANDS[index + 1]?.from ?? TARGET.max;
    return `var(--score-${token}) ${share(from)}% ${share(to)}%`;
  }).join(', ')})`,
};

/** The ticks of the presets, crossing the track, over it and under the thumb, each in the colour of the band to its left. */
function Ticks() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {PRESETS.map(({ name, score }) => (
        <span
          key={name}
          className="absolute top-1/2 left-(--at) h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-(--tick)"
          style={{ ...at(score), '--tick': `var(--score-${bandOf(score)})` }}
        />
      ))}
    </div>
  );
}

/**
 * The names of the presets under their ticks, each a button that goes to its score. The first and
 * the last are drawn in from the ends by a couple of characters, so two presets ten points apart
 * keep their names apart and none hangs past the track.
 */
function PresetNames({ onPress }: { onPress: (score: number) => void }) {
  const last = PRESETS.length - 1;
  return (
    <div className="relative mx-1.5 h-4 text-[0.625rem]/4 text-muted-foreground">
      {PRESETS.map(({ name, score }, index) => (
        <button
          key={name}
          type="button"
          className={cn(
            'absolute top-0 left-(--at) rounded-sm px-0.5 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
            index === 0 ? 'translate-x-[calc(2ch-100%)]' : index === last ? '-translate-x-[2ch]' : '-translate-x-1/2',
          )}
          style={at(score)}
          aria-label={`${name}, ${score}`}
          onClick={() => {
            onPress(score);
          }}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

/** The way back to the package's default, once the slider was moved: a slider cannot be cleared as a field can. */
function Forget({ onPress }: { onPress: () => void }) {
  return (
    <>
      {' '}
      <button
        type="button"
        className="rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onPress}
      >
        use the default
      </button>
    </>
  );
}

/**
 * The target score (ADR-0001 D3): a slider from 30 to 100, with the words SSIMULACRA2 gives the
 * score next to it and the package's presets marked on the track. Until it is moved, it stands at
 * the target the newest result reports, which is the package's default for that image, or at the
 * package's documented default while there is none, and says so. Once moved, a button next to the
 * words takes it back to the default.
 */
export function TargetSlider({ field, labelledBy, onMove }: TargetSliderProps) {
  const chosen = field.state.value;
  const reported = useReported();
  const shown = standing(chosen, reported);
  const said = wordsFor(chosen, reported);
  const move = (score: number) => {
    onMove();
    field.handleChange(score);
  };
  const forget = () => {
    onMove();
    field.handleChange(null);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Slider
          aria-labelledby={labelledBy}
          aria-describedby={`${labelledBy}-words`}
          className="px-1.5"
          style={{ ...TRACK, '--thumb': `var(--score-${bandAt(shown)}-solid)` }}
          trackClassName="bg-(image:--track)"
          indicatorClassName="bg-transparent"
          thumbClassName="border-foreground bg-(--thumb)"
          thumbAlignment="center"
          min={TARGET.min}
          max={TARGET.max}
          step={1}
          value={[shown]}
          getAriaValueText={(_, value) => (chosen === null ? said : describe(value))}
          onValueChange={(value: number | readonly number[]) => {
            move(typeof value === 'number' ? value : (value[0] ?? shown));
          }}
        >
          <Ticks />
        </Slider>
      </div>
      <PresetNames onPress={move} />
      <p id={`${labelledBy}-words`} className="text-xs/relaxed text-muted-foreground">
        <span>{said}</span>
        {chosen !== null && <Forget onPress={forget} />}
      </p>
    </div>
  );
}
