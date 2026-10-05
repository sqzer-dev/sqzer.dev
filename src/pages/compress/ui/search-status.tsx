import { useSearch } from '../model/context';

/** One line on where the search is. A failure is the same line, marked. */
export function SearchStatus() {
  const failed = useSearch((snapshot) => snapshot.matches({ open: 'failed' }));
  const text = useSearch((snapshot) => {
    const { version, image, trials, result, error } = snapshot.context;
    if (snapshot.matches({ open: 'failed' })) return error;
    if (snapshot.matches({ open: 'empty' })) return version === null ? 'Loading the encoder.' : 'Ready.';
    if (snapshot.matches({ open: { searching: 'reading' } })) return `Reading ${image?.name}.`;
    if (snapshot.matches({ open: 'result' })) return `Done in ${result?.seconds.toFixed(1)} s.`;
    const trial = trials.at(-1);
    if (!trial) return 'Encoding.';
    return `Encoding: trial ${trial.n} of at most ${trial.max}, quality ${trial.quality} scores ${trial.score.toFixed(1)}.`;
  });

  return (
    <output id="status" data-failed={failed || undefined}>
      {text}
    </output>
  );
}
