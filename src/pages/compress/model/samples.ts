// The images the empty page offers to try (ADR-0009), served from the page's own origin under
// `public/samples/`, with their credits in `public/samples/CREDITS.txt`.

/** One of them: its file, what its tile says, and the small copy the tile shows. */
export type Sample = {
  /** Its place on the empty page, and its name in the tests. */
  key: 'aurora' | 'rocket' | 'julia';
  /** The file's name, which the result's name follows. */
  file: string;
  type: string;
  /** What the tile says, beside the size. */
  label: string;
  /** The file's size in bytes, as the tile says it. `samples.test.tsx` reads the file and checks. */
  size: number;
  /** The small copy the tile shows, and its size in pixels, so the tile holds its place while it loads. */
  shown: { file: string; width: number; height: number };
};

export const SAMPLES: Sample[] = [
  {
    key: 'aurora',
    file: 'aurora.jpg',
    type: 'image/jpeg',
    label: 'Aurora',
    size: 562_327,
    shown: { file: 'aurora.shown.avif', width: 1152, height: 768 },
  },
  {
    key: 'rocket',
    file: 'zhuque-2e.jpg',
    type: 'image/jpeg',
    label: 'Rocket fuel, 20 MP',
    size: 2_118_662,
    shown: { file: 'zhuque-2e.shown.avif', width: 1344, height: 897 },
  },
  {
    key: 'julia',
    file: 'julia.png',
    type: 'image/png',
    label: 'Julia set',
    size: 568_468,
    shown: { file: 'julia.shown.avif', width: 960, height: 553 },
  },
];

/** Where a file of the samples is served. */
export const sampleUrl = (file: string) => `${import.meta.env.BASE_URL}samples/${file}`;

/** The sample as a file, as if it had been picked. Aborted by `signal`, it rejects and picks nothing. */
export async function fetchSample({ file, type }: Sample, signal: AbortSignal): Promise<File> {
  const response = await fetch(sampleUrl(file), { signal });
  if (!response.ok) throw new Error(`${file}: ${response.status} ${response.statusText}`);
  return new File([await response.blob()], file, { type });
}
