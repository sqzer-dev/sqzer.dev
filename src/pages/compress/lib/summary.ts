import type { EncodeResult } from '../model/encode-result';

// `673 B`, `45.6 KB`, `1.2 MB`, as the command line prints them.
function bytes(n: number) {
  if (n < 1000) return `${n} B`;
  if (n < 1e6) return `${(n / 1e3).toFixed(1)} KB`;
  return `${(n / 1e6).toFixed(1)} MB`;
}

function change(before: number, after: number) {
  const percent = Math.round((after / before - 1) * 100);
  return `${percent > 0 ? '+' : ''}${percent}%`;
}

/** The line the command line prints for a file, then what it leaves to `--json`. */
export function summarize(source: { name: string; size: number }, { output, file }: EncodeResult) {
  const { format, backend, width, height, outputWidth, outputHeight } = output;
  const how = output.lossless
    ? 'lossless'
    : `q${output.quality}${output.score === undefined ? '' : ` s${output.score.toFixed(1)}`}`;
  const resized = outputWidth === width && outputHeight === height ? '' : ` -> ${outputWidth}x${outputHeight}`;
  const lines = [
    `${source.name} -> ${file.name}  ${bytes(source.size)} -> ${bytes(file.size)}  ${change(source.size, file.size)}  ${format} ${how}`,
    `${width}x${height}${resized}  ${output.content}  ${output.inputFormat ?? 'drawn by the browser'} -> ${format} (${backend})`,
  ];
  if (output.trials?.length) {
    const reached = output.reached ? 'reached' : 'not reached';
    const count = output.trials.length === 1 ? '1 trial' : `${output.trials.length} trials`;
    const trials = output.trials.map((trial) => `q${trial.quality} s${trial.score.toFixed(1)}`).join(', ');
    lines.push(`target ${output.target} ${reached} in ${count}: ${trials}`);
  }
  return lines.join('\n');
}
